import path from 'path'
import {EmptyObservable} from 'rxjs/observable/EmptyObservable'
import {Observable} from 'rxjs/Observable'
import {_catch} from 'rxjs/operator/catch'
import {_do} from 'rxjs/operator/do'
import {concat} from 'rxjs/operator/concat'
import {distinctKey} from 'rxjs/operator/distinctKey'
import {expand} from 'rxjs/operator/expand'
import {map} from 'rxjs/operator/map'
import {mergeMap} from 'rxjs/operator/mergeMap'
import crypto from 'crypto'

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

export function resolveLocal (_path) {
  return util.readlink(_path)
    ::mergeMap((relTarget) => {
      const target = path.resolve(_path, relTarget)
      const filename = path.join(target, 'package.json')
      return util.readFileJSON(filename)
        ::map((pkgJSON) => ({ pkgJSON, target, path: _path, local: true }))
    })
}

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
    return parseDependencies(pkgJSON, fields)::resolve(cwd, target)
  })
}

/**
 * create a relative symbolic link to a dependency.
 * @param {Dep} dep - dependency to be linked.
 * @return {Observable} - an empty observable sequence that will be completed
 * once the symbolic link has been created.
 */
export function link ({ path: absPath, target: absTarget }) {
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
  return o::_catch((err) => {
    if (err.code === 'ENOENT') {
      return download(tarball)
        ::_do(({ shasum: actual }) => {
          if (actual !== shasum) {
            throw new CorruptedPackageError(tarball, shasum, actual)
          }
        })
        ::concat(o)
    }
    throw err
  })
}

/**
 * download the tarballs into their respective `target`.
 * @return {Observable} - an empty observable sequence that will be completed
 * once all dependencies have been downloaded.
 */
export function fetchAll () {
  return cache.init()
    ::concat(
      this
        ::distinctKey('target')
        ::mergeMap(fetch)
    )
}
