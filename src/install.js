import path from 'path'
import {EmptyObservable} from 'rxjs/observable/EmptyObservable'
import {ArrayObservable} from 'rxjs/observable/ArrayObservable'
import {Observable} from 'rxjs/Observable'
import {_do} from 'rxjs/operator/do'
import {concat} from 'rxjs/operator/concat'
import {filter} from 'rxjs/operator/filter'
import {distinctKey} from 'rxjs/operator/distinctKey'
import {expand} from 'rxjs/operator/expand'
import {map} from 'rxjs/operator/map'
import {reduce} from 'rxjs/operator/reduce'
import {mergeMap} from 'rxjs/operator/mergeMap'
import crypto from 'crypto'
import {spawn} from 'child_process'

import {CorruptedPackageError} from './errors'
import * as cache from './fs_cache'
import * as registry from './registry'
import * as util from './util'
import * as config from './config'

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
 */
export const DEPENDENCY_FIELDS = ['dependencies']

/**
 * resolve a dependency's `package.json` file from the local file system.
 * @param  {String} _path - path of the dependency.
 * @return {Observable} - observable sequence of `package.json` objects.
 */
export function resolveLocal (_path) {
  return util.readlink(_path)
    ::mergeMap((relTarget) => {
      const target = path.resolve(_path, relTarget)
      const filename = path.join(target, 'package.json')
      return util.readFileJSON(filename)
        ::map((pkgJSON) => ({ pkgJSON, target, path: _path, local: true }))
    })
}

/**
 * obtain a dependency's `package.json` file using the pre-configured registry.
 * @param  {String} _path - path of the dependency.
 * @param  {String} name - name of the dependency that should be looked up in
 * the registry.
 * @param  {String]} version - SemVer compatible version string.
 * @param  {String} cwd - current working directory.
 * @return {Observable} - observable sequence of `package.json` objects.
 */
export function resolveRemote (_path, name, version, cwd) {
  return registry.resolve(name, version)
    ::map((pkgJSON) => {
      const target = path.join(cwd, 'node_modules', pkgJSON.dist.shasum)
      return { pkgJSON, target, path: _path, local: false }
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
export function resolve (cwd, target) {
  return this::mergeMap(([name, version]) => {
    const _path = path.join(target, 'node_modules', name)
    return resolveLocal(_path)
      ::util.catchByCode({
        ENOENT: () => resolveRemote(_path, name, version, cwd)
      })
  })
}

/**
 * resolve all dependencies starting at the current working directory.
 *
 * @param  {String} cwd - current working directory.
 * @return {Observable} - an observable sequence of resolved dependencies.
 */
export function resolveAll (cwd) {
  const targets = Object.create(null)

  return this::expand(({ target, pkgJSON }) => {
    // cancel when we get into a circular dependency
    if (target in targets) return EmptyObservable.create()
    targets[target] = true
    // install devDependencies of entry dependency (project-level)
    const fields = target === cwd ? ENTRY_DEPENDENCY_FIELDS : DEPENDENCY_FIELDS
    const bundleDependencies = (pkgJSON.bundleDependencies || [])
      .concat(pkgJSON.bundledDependencies || [])

    return parseDependencies(pkgJSON, fields)
      ::filter(([name]) => bundleDependencies.indexOf(name) === -1)
      ::resolve(cwd, target)
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
  for (let field of fields) {
    const dependencies = pkgJSON[field]
    for (let name in dependencies) {
      allDependencies[name] = dependencies[name]
    }
  }
  return allDependencies
}

/**
 * extract specified dependencies from a specific `package.json`.
 * @param  {Object} pkgJSON - a plain JavaScript object representing a
 * `package.json` file.
 * @param  {Array.<String>} fields - an array of dependency fields to be
 * followed.
 * @return {Observable} - an observable sequence of `[name, version]` entries.
 */
export function parseDependencies (pkgJSON, fields) {
  const allDependencies = mergeDependencies(pkgJSON, fields)
  return Observable.create((observer) => {
    for (let name in allDependencies) {
      observer.next([name, allDependencies[name]])
    }
    observer.complete()
  })
}

/**
 * create a relative symbolic link to a dependency.
 * @param {Dep} dep - dependency to be linked.
 * @return {Observable} - an empty observable sequence that will be completed
 * once the symbolic link has been created.
 */
export function link (dep) {
  const {path: absPath, target: absTarget} = dep
  const relTarget = path.relative(absPath, absTarget)
  return util.forceSymlink(relTarget, absPath)
}

/**
 * symlink the intermediate results of the underlying observable sequence
 * @return {Observable} - an empty observable sequence that will be completed
 * once all dependencies have been symlinked.
 */
export function linkAll () {
  return this::distinctKey('path')::mergeMap(link)
    // bundled dependencies
    ::util.catchByCode({
      EEXIST: () => EmptyObservable.create()
    })
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

      resp.on('data', (chunk) => shasum.update(chunk))

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
 * @return {Observable} - an empty observable sequence that will be completed
 * once the dependency has been downloaded.
 */
export function fetch ({target, pkgJSON: {dist: {tarball, shasum}}}) {
  const o = cache.extract(target, shasum)
  // TODO: Create two WriteStreams: One to cache, one to directory
  return o::util.catchByCode({
    ENOENT: () => download(tarball)
      ::_do(({ shasum: actual }) => {
        if (actual !== shasum) {
          throw new CorruptedPackageError(tarball, shasum, actual)
        }
      })
      ::concat(o)
  })
}

/**
 * download the tarballs into their respective `target`.
 * @return {Observable} - an empty observable sequence that will be completed
 * once all dependencies have been downloaded.
 */
export function fetchAll () {
  return this
    ::filter(({ local }) => !local)
    ::distinctKey('target')::mergeMap(fetch)
}

export const LIFECYCLE_SCRIPTS = ['preinstall', 'install', 'postinstall']

export function build (dep) {
  const {target, script} = dep
  return Observable.create((observer) => {
    console.log(spawn)
    observer.complete()
  })
}

export function buildAll () {
  return this
    ::filter(({ local }) => !local)
    ::reduce((results, { target, pkgJSON: { scripts = {} } }) => {
      for (let name of LIFECYCLE_SCRIPTS) {
        const script = scripts[name]
        if (script) results.push({ target, script })
      }
      return results
    }, [])
    ::mergeMap((scripts) => ArrayObservable.create(scripts))
    ::mergeMap(build)
}
