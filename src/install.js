import crypto from 'crypto'
import path from 'path'
import {ArrayObservable} from 'rxjs/observable/ArrayObservable'
import {EmptyObservable} from 'rxjs/observable/EmptyObservable'
import {ScalarObservable} from 'rxjs/observable/ScalarObservable'
import {Observable} from 'rxjs/Observable'
import {_do} from 'rxjs/operator/do'
import {_finally} from 'rxjs/operator/finally'
import {concat} from 'rxjs/operator/concat'
import {distinctKey} from 'rxjs/operator/distinctKey'
import {every} from 'rxjs/operator/every'
import {expand} from 'rxjs/operator/expand'
import {filter} from 'rxjs/operator/filter'
import {map} from 'rxjs/operator/map'
import {mergeMap} from 'rxjs/operator/mergeMap'
import {spawn} from 'child_process'
import needle from 'needle'
import npa from 'npm-package-arg'

import * as cache from './fs_cache'
import * as config from './config'
import * as errors from './errors'
import * as registry from './registry'
import * as util from './util'
import * as tarball from './tarball'
import * as progress from './progress'
import {normalizeBin, parseDependencies} from './pkg_json'

/**
 * properties of project-level `package.json` files that will be checked for
 * dependencies.
 * @type {Array.<String>}
 * @readonly
 */
export const ENTRY_DEPENDENCY_FIELDS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies'
]

/**
 * properties of `package.json` of sub-dependencies that will be checked for
 * dependences.
 * @type {Array.<String>}
 * @readonly
 */
export const DEPENDENCY_FIELDS = [
  'dependencies',
  'optionalDependencies'
]

/**
 * names of lifecycle scripts that should be run as part of the installation
 * process of a specific package (= properties of `scripts` object in
 * `package.json`).
 * @type {Array.<String>}
 * @readonly
 */
export const LIFECYCLE_SCRIPTS = [
  'preinstall',
  'install',
  'postinstall'
]

/**
 * resolve a dependency's `package.json` file from the local file system.
 * @param  {String} parentTarget - absolute parent's node_modules path.
 * @param  {String} _path - path of the dependency.
 * @return {Observable} - observable sequence of `package.json` objects.
 */
export function resolveFromNodeModules (parentTarget, _path) {
  return util.readlink(_path)::mergeMap((relTarget) => {
    const target = path.resolve(path.dirname(_path), relTarget)
    const filename = path.join(target, 'package.json')
    return util.readFileJSON(filename)::map((pkgJson) => ({
      parentTarget, pkgJson, target, path: _path, local: true
    }))
  })
}

/**
 * resolve a dependency's `package.json` file from the local file system.
 * @param  {String} parentTarget - absolute parent's node_modules path.
 * @param  {String} _path - path of the dependency.
 * @return {Observable} - observable sequence of `package.json` objects.
 */
export function resolveDownloaded (parentTarget, target, _path, cwd) {
  const pkgPath = path.join(target, 'package.json')

  return util.readFileJSON(pkgPath)
    ::map((pkgJson) => ({ parentTarget, pkgJson, target, path: _path, local: false, type: 'remote' }))
}

export function fetchFromRegistry () {
  const {target, pkgJson: {dist: {shasum, tarball}}} = this

  const o = cache.extract(target, shasum)
  return o::util.catchByCode({
    ENOENT: () => download(tarball)
      ::_do(({ shasum: actual }) => {
        if (actual !== shasum) {
          throw new errors.CorruptedPackageError(tarball, shasum, actual)
        }
      })
      ::concat(o)
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
export function resolveFromRemote (parentTarget, _path, name, version, cwd) {
  const pkgName = `${name}@${version}`
  const parsedPkg = npa(pkgName)

  switch (parsedPkg.type) {
    case 'range':
    case 'version':
    case 'tag':
      return registry.match(name, version)::map((pkgJson) => {
        const target = path.join(cwd, 'node_modules', pkgJson.dist.shasum)
        const fetch = fetchFromRegistry
        const local = false
        return { parentTarget, pkgJson, target, path: _path, local, fetch }
      })
    case 'remote':
      const pkgJson = tarball.resolve(name, version, parsedPkg.spec)
      const shasum = pkgJson.dist.shasum
      const target = path.join(cwd, 'node_modules', pkgJson.dist.shasum)
      let cached

      return Observable.create((observer) => {
        let resolved
        const errorHandler = (error) => observer.error(error)
        const finishHandler = () => {
          const newPath = path.join(config.cacheDir, shasum)
          return util.rename(cached.path, newPath).subscribe(null, null, () => {
            cache.extract(target, shasum).subscribe(null, null, () => {
              resolveDownloaded(parentTarget, path.join(cwd, 'node_modules', pkgJson.dist.shasum), _path, cwd, { sha: shasum, tmpPath: cached.path })
                .subscribe((x) => resolved = x, null, (v) => {
                  resolved.fetch = () => EmptyObservable.create()
                  observer.next(resolved)
                  observer.complete()
                })
            })
          })
        }

        const response = needle.get(version, {
          follow_max: 5
        })

        cached = response
          .pipe(cache.write())

        cached.on('error', errorHandler)
        cached.on('finish', finishHandler)

        response.on('error', errorHandler)
      })

    case 'hosted':
      throw new Error('GitHub dependencies are not yet supported')
    default:
      throw new Error(`Unknown package spec: ${parsedPkg.type} on ${pkgName}`)
  }
}

/**
 * resolve an individual sub-dependency based on the parent's target and the
 * current working directory.
 * @param  {String} cwd - current working directory.
 * @param  {String} parentTarget - target path used for determining the sub-
 * dependency's path.
 * @return {Obserable} - observable sequence of `package.json` root documents
 * wrapped into dependency objects representing the resolved sub-dependency.
 */
export function resolve (cwd, parentTarget) {
  return this::mergeMap(([name, version]) => {
    progress.add()
    progress.report(`resolving ${name}@${version}`)
    const _path = path.join(parentTarget, 'node_modules', name)

    return resolveFromNodeModules(parentTarget, _path)
      ::util.catchByCode({
        ENOENT: () => resolveFromRemote(parentTarget, _path, name, version, cwd)
      })
      ::_finally(progress.complete)
  })
}

/**
 * resolve all dependencies starting at the current working directory.
 * @param  {String} cwd - current working directory.
 * @return {Observable} - an observable sequence of resolved dependencies.
 */
export function resolveAll (cwd) {
  const targets = Object.create(null)

  return this::expand(({target, pkgJson}) => {
    // cancel when we get into a circular dependency
    if (target in targets) return EmptyObservable.create()
    else targets[target] = true

    // install devDependencies of entry dependency (project-level)
    const isEntry = target === cwd
    const fields = isEntry ? ENTRY_DEPENDENCY_FIELDS : DEPENDENCY_FIELDS
    const dependencies = parseDependencies(pkgJson, fields)
    return ArrayObservable.create(dependencies)::resolve(cwd, target)
  })
}

function resolveSymlink (src, dst) {
  return [ path.relative(path.dirname(dst), src), dst ]
}

function getLinks (pkgJson, parentTarget, absTarget, absPath) {
  const links = [ resolveSymlink(absTarget, absPath) ]
  const bin = normalizeBin(pkgJson)
  const names = Object.keys(bin)
  for (let i = 0; i < names.length; i++) {
    const name = names[i]
    const dst = path.join(parentTarget, 'node_modules', '.bin', name)
    const src = path.join(absTarget, bin[name])
    links.push(resolveSymlink(src, dst))
  }
  return links
}

/**
 * create a relative symbolic link to a dependency.
 * @param {Dep} dep - dependency to be linked.
 * @return {Observable} - empty observable sequence that will be completed
 * once the symbolic link has been created.
 */
export function link ({path: absPath, target: absTarget, parentTarget, pkgJson}) {
  const links = getLinks(pkgJson, parentTarget, absTarget, absPath)
  return ArrayObservable.create(links)
    ::mergeMap(([src, dst]) => util.forceSymlink(src, dst))
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
  return Observable.create((observer) => {
    const errorHandler = (error) => observer.error(error)
    const dataHandler = (chunk) => {
      shasum.update(chunk)
    }
    const finishHandler = () => {
      const hex = shasum.digest('hex')
      observer.next({ tmpPath: cached.path, shasum: hex })
      observer.complete()
    }

    const shasum = crypto.createHash('sha1')
    const response = needle.get(tarball, config.httpOptions)
    const cached = response.pipe(cache.write())

    response.on('data', dataHandler)
    response.on('error', errorHandler)

    cached.on('error', errorHandler)
    cached.on('finish', finishHandler)
  })
  ::mergeMap(({ tmpPath, shasum }) => {
    const newPath = path.join(config.cacheDir, shasum)
    return util.rename(tmpPath, newPath)
  })
}

function fixPermissions (target, bin) {
  const execMode = parseInt('0777', 8) & (~process.umask())
  const paths = []
  for (let name in bin) {
    paths.push(path.resolve(target, bin[name]))
  }
  return ArrayObservable.create(paths)
    ::mergeMap((path) => util.chmod(path, execMode))
}

function fetch (dep) {
  const {target, pkgJson: {name, bin}} = dep
  const postFetch = fixPermissions(target, normalizeBin({ name, bin }))
  progress.add()
  return dep.fetch()::concat(postFetch)::_finally(progress.complete)
}

/**
 * given an observable sequence of dependencies, filter out those that have
 * already been fetched.
 * @param  {Object} dep - possibly fetched dependency.
 * @return {Observable} - observable sequence of unavailable dependencies.
 */
function filterFetched (dep) {
  return util.stat(path.join(dep.target, 'package.json'))
    ::mergeMap((stat) => EmptyObservable.create())
    ::util.catchByCode({ ENOENT: () => ScalarObservable.create(dep) })
}

/**
 * download the tarballs into their respective `target`.
 * @return {Observable} - empty observable sequence that will be completed
 * once all dependencies have been downloaded.
 */
export function fetchAll () {
  return this::distinctKey('target')
    // check if target/package.json already exists
    ::mergeMap(filterFetched)
    ::mergeMap(fetch)
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
  const { target, pkgJson: { scripts = {} } } = dep
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
    ::map(parseLifecycleScripts)
    ::mergeMap((scripts) => ArrayObservable.create(scripts))
    ::mergeMap(build)
    ::every((code) => code === 0)
    ::filter((ok) => !ok)
    ::_do((ok) => { throw new errors.FailedBuildError() })
}
