import crypto from 'crypto'
import path from 'path'
import {ArrayObservable} from 'rxjs/observable/ArrayObservable'
import {EmptyObservable} from 'rxjs/observable/EmptyObservable'
import {Observable} from 'rxjs/Observable'
import {_do} from 'rxjs/operator/do'
import {concat} from 'rxjs/operator/concat'
import {distinctKey} from 'rxjs/operator/distinctKey'
import {every} from 'rxjs/operator/every'
import {expand} from 'rxjs/operator/expand'
import {filter} from 'rxjs/operator/filter'
import {map} from 'rxjs/operator/map'
import {mergeMap} from 'rxjs/operator/mergeMap'
import {spawn} from 'child_process'

import * as cache from './fs_cache'
import * as config from './config'
import * as errors from './errors'
import * as registry from './registry'
import * as util from './util'

/**
 * properties of project-level `package.json` files that will be checked for
 * dependencies.
 * @type {Array.<String>}
 * @readonly
 */
export const ENTRY_DEPENDENCY_FIELDS = ['dependencies', 'devDependencies']

/**
 * properties of `package.json` of sub-dependencies that will be checked for
 * dependences.
 * @type {Array.<String>}
 * @readonly
 */
export const DEPENDENCY_FIELDS = ['dependencies']

/**
 * names of lifecycle scripts that should be run as part of the installation
 * process of a specific package (= properties of `scripts` object in
 * `package.json`).
 * @type {Array.<String>}
 * @readonly
 */
export const LIFECYCLE_SCRIPTS = ['preinstall', 'install', 'postinstall']

/**
 * resolve a dependency's `package.json` file from the local file system.
 * @param  {String} parentTarget - absolute parent's node_modules path.
 * @param  {String} _path - path of the dependency.
 * @return {Observable} - observable sequence of `package.json` objects.
 */
export function resolveLocal (parentTarget, _path) {
  return util.readlink(_path)
    ::mergeMap((relTarget) => {
      const target = path.resolve(_path, relTarget)
      const filename = path.join(target, 'package.json')
      return util.readFileJSON(filename)
        ::map((pkgJSON) => ({ parentTarget, pkgJSON, target, path: _path, local: true }))
    })
}

/**
 * obtain a dependency's `package.json` file using the pre-configured registry.
 * @param  {String} parentTarget - absolute parent's node_modules path.
 * @param  {String} _path - path of the dependency.
 * @param  {String} name - name of the dependency that should be looked up in
 * the registry.
 * @param  {String} version - SemVer compatible version string.
 * @param  {String} cwd - current working directory.
 * @return {Observable} - observable sequence of `package.json` objects.
 */
export function resolveRemote (parentTarget, _path, name, version, cwd) {
  return registry.resolve(name, version)
    ::map((pkgJSON) => {
      const target = path.join(cwd, 'node_modules', pkgJSON.dist.shasum)
      return { parentTarget, pkgJSON, target, path: _path, local: false }
    })
}

/**
 * resolve an individual sub-dependency based on the parent's target and the
 * current working directory.
 * @param  {String} cwd - current working directory.
 * @param  {String} target - target path used for determining the sub-
 * dependency's path.
 * @return {Obserable} - observable sequence of `package.json` root documents
 * wrapped into dependency objects representing the resolved sub-dependency.
 */
export function resolve (progress, cwd, target) {
  return this::mergeMap(([name, version]) => {
    const _path = path.join(target, 'node_modules', name)
    return resolveLocal(target, _path, cwd)
      ::util.catchByCode({
        ENOENT: () => resolveRemote(target, _path, name, version, cwd)
      })
      ::_do(() => progress && progress.tick())
  })
}

/**
 * resolve all dependencies starting at the current working directory.
 *
 * @param  {String} cwd - current working directory.
 * @return {Observable} - an observable sequence of resolved dependencies.
 */
export function resolveAll (progress, cwd) {
  const targets = Object.create(null)

  return this::expand((parent) => {
    const {target, pkgJSON} = parent

    // cancel when we get into a circular dependency
    if (target in targets) return EmptyObservable.create()
    targets[target] = true

    // install devDependencies of entry dependency (project-level)
    const fields = target === cwd ? ENTRY_DEPENDENCY_FIELDS : DEPENDENCY_FIELDS
    const bundleDependencies = (pkgJSON.bundleDependencies || [])
      .concat(pkgJSON.bundledDependencies || [])

    const dependencies = parseDependencies(pkgJSON, fields)
    if (progress) progress.total += dependencies.length
    return ArrayObservable.create(dependencies)
      ::filter(([name]) => bundleDependencies.indexOf(name) === -1)
      ::resolve(progress, cwd, target)
  })
}

/**
 * merge dependency fields.
 * @param  {Object} pkgJSON - `package.json` object from which the dependencies
 * should be obtained.
 * @param  {Array.<String>} fields - property names of dependencies to be merged
 * together.
 * @return {Object} - merged dependencies.
 */
function mergeDependencies (pkgJSON, fields) {
  const allDependencies = {}
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i]
    const dependencies = pkgJSON[field] || {}
    const names = Object.keys(dependencies)
    for (let j = 0; j < names.length; j++) {
      const name = names[j]
      allDependencies[name] = dependencies[name]
    }
  }
  return allDependencies
}

/**
 * extract specified dependencies from a specific `package.json`.
 * @param  {Object} pkgJSON - plain JavaScript object representing a
 * `package.json` file.
 * @param  {Array.<String>} fields - array of dependency fields to be followed.
 * @return {Array} - array of dependency pairs.
 */
export function parseDependencies (pkgJSON, fields) {
  const allDependencies = mergeDependencies(pkgJSON, fields)
  const names = Object.keys(allDependencies)
  const results = []
  for (let i = 0; i < names.length; i++) {
    const name = names[i]
    results.push([name, allDependencies[name]])
  }
  return results
}

/**
 * create a relative symbolic link to a dependency.
 * @param {Dep} dep - dependency to be linked.
 * @return {Observable} - empty observable sequence that will be completed
 * once the symbolic link has been created.
 */
export function link (dep) {
  const {path: absPath, target: absTarget, parentTarget, pkgJSON} = dep
  const links = [ [absTarget, absPath] ]

  const bin = typeof pkgJSON.bin === 'string'
    ? ({ [pkgJSON.name]: pkgJSON.bin })
    : (pkgJSON.bin || {})

  const names = Object.keys(bin)
  for (let i = 0; i < names.length; i++) {
    const name = names[i]
    const dst = path.join(parentTarget, 'node_modules', '.bin', name)
    const src = path.join(absTarget, bin[name])
    links.push([src, dst])
  }

  return ArrayObservable.create(links)
    ::mergeMap(([src, dst]) => {
      // use relative pathnames
      const relSrc = path.relative(path.dirname(dst), src)
      return util.forceSymlink(relSrc, dst)
    })
}

/**
 * symlink the intermediate results of the underlying observable sequence
 * @return {Observable} - empty observable sequence that will be completed
 * once all dependencies have been symlinked.
 */
export function linkAll () {
  return this::distinctKey('path')::mergeMap(link)
}

function download (tarball) {
  return util.httpGet(tarball)
    ::mergeMap((resp) => Observable.create((observer) => {
      const shasum = crypto.createHash('sha1')

      const errHandler = (err) => {
        observer.error(err)
      }

      const finHandler = () => {
        const tmpPath = cached.path
        const hex = shasum.digest('hex')
        observer.next({ tmpPath, shasum: hex })
        observer.complete()
      }

      resp.on('data', (chunk) => {
       shasum.update(chunk)
      })

      const cached = resp.pipe(cache.write())
        .on('error', errHandler)
        .on('finish', finHandler)
    }))
    ::mergeMap(({ tmpPath, shasum }) => {
      const newPath = path.join(config.cacheDir, shasum)
      return util.rename(tmpPath, newPath)
    })
}

/**
 * download the tarball of the package into the `target` path.
 * @param {Dep} dep - dependency to be fetched.
 * @return {Observable} - empty observable sequence that will be completed
 * once the dependency has been downloaded.
 */
export function fetch (logLevel, progress, {target, pkgJSON: {name, version, dist: {tarball, shasum}}}) {
  if (logLevel) console.log(`Installing ${name}@${version}`)

  const o = cache.extract(target, shasum)
  // TODO: Create two WriteStreams: One to cache, one to directory
  return o::util.catchByCode({
    ENOENT: () => download(tarball)
      ::_do(({ shasum: actual }) => {
        if (actual !== shasum) {
          throw new errors.CorruptedPackageError(tarball, shasum, actual)
        }
      })
      ::_do(() => progress && progress.tick())
      ::concat(o)
  })
}

/**
 * download the tarballs into their respective `target`.
 * @return {Observable} - empty observable sequence that will be completed
 * once all dependencies have been downloaded.
 */
export function fetchAll (logLevel, progress) {
  return this::distinctKey('target')
    ::filter(({ local }) => !local)
    ::mergeMap(fetch.bind(null, logLevel, progress))
}

export function build ({target, script}) {
  return Observable.create((observer) => {
    const env = Object.create(process.env)
    env.PATH = [
      path.join(target, 'node_modules', '.bin'),
      path.resolve(__dirname, '..', 'node_modules', '.bin'),
      process.env.PATH
    ].join(path.delimiter)

    const childProcess = spawn(config.sh, [config.shFlag, script], {
      cwd: target,
      env: env,
      stdio: 'inherit',
      shell: true
    })
    childProcess.on('error', (error) => {
      observer.error(error)
    })
    childProcess.on('close', (code) => {
      observer.next(code)
      observer.complete()
    })
  })
}

/**
 * extract lifecycle scripts from supplied dependency.
 * @param {Dep} dep - dependency to be parsed.
 * @return {Array.<Object>} - array of script targets to be executed.
 */
export function parseLifecycleScripts (dep) {
  const { target, pkgJSON: { scripts = {} } } = dep
  const results = []
  for (let i = 0; i < LIFECYCLE_SCRIPTS.length; i++) {
    const name = LIFECYCLE_SCRIPTS[i]
    const script = scripts[name]
    if (script) results.push({ target, script })
  }
  return results
}

/**
 * run all lifecycle scripts upon completion of the installation process.
 * ensures that all scripts exit with 0 (success), otherwise an error will be
 * thrown.
 * @return {Observable} - empty observable sequence that will be completed once
 * all lifecycle scripts have been executed.
 */
export function buildAll () {
  return this
    ::filter(({ local }) => !local)
    ::map(parseLifecycleScripts)
    ::mergeMap((scripts) => ArrayObservable.create(scripts))
    ::mergeMap(build)
    ::every((code) => code === 0)
    ::filter((ok) => !ok)
    ::_do((ok) => { throw new errors.FailedBuildError() })
}
