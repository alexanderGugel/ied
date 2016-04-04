import path from 'path'
import xtend from 'xtend'
import {ArrayObservable} from 'rxjs/observable/ArrayObservable'
import {EmptyObservable} from 'rxjs/observable/EmptyObservable'
import {_do} from 'rxjs/operator/do'
import {_catch} from 'rxjs/operator/catch'
import {_finally} from 'rxjs/operator/finally'
import {distinctKey} from 'rxjs/operator/distinctKey'
import {retryWhen} from 'rxjs/operator/retryWhen'
import {expand} from 'rxjs/operator/expand'
import {concat} from 'rxjs/operator/concat'
import {map} from 'rxjs/operator/map'
import {mergeMap} from 'rxjs/operator/mergeMap'
import {merge} from 'rxjs/operator/merge'
import {share} from 'rxjs/operator/share'
import {skip} from 'rxjs/operator/skip'

import * as cache from './fs_cache'
import * as registry from './registry'
import * as util from './util'
import {EntryDep} from './entry_dep'
import {Dep} from './dep'
import {download} from './tarball'
import status from './status'

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
  return this::mergeMap(([name, version]) =>
    registry.resolve(name, version)::map((pkgJSON) => new Dep({
      pkgJSON,
      target: path.join(cwd, 'node_modules', pkgJSON.dist.shasum),
      path: path.join(target, 'node_modules', name)
    }))
  )
}

/**
 * extract specified dependencies from a specific `package.json`.
 *
 * @param  {Object} pkgJSON - a plain JavaScript object representing a
 * `package.json` file.
 * @param  {Array.<String>} fields - an array of dependency fields to be
 * followed.
 * @return {ArrayObservable} - an observable sequence of `[name, version]`
 * entries.
 */
export function extractDependencies (pkgJSON, fields) {
  const dependencies = fields.map((field) => pkgJSON[field])
  const allDependencies = xtend.apply(null, dependencies)
  const entries = []
  const names = Object.keys(allDependencies)
  for (let i = 0; i < names.length; i++) {
    const name = names[i]
    entries[i] = [name, allDependencies[name]]
  }
  return ArrayObservable.create(entries)
}

/**
 * log that a dependency constraint is currently being resolved.
 * @param  {Array.<String>} nameVersion - `[name, version]` tuple
 */
export function logResolving ([name, version]) {
  status.update(`resolving ${name}@${version}`).start()
}

/**
 * log that a package has been successfully resolved.
 * @param  {Dep} dep - resolved dependency.
 */
export function logResolved ({pkgJSON: {name, version, dist: {shasum}}}) {
  status.update(`resolved ${name}@${version} [${shasum.substr(0, 7)}]`).complete()
}

/**
 * handle an error that occurred while resolving a specific dependency.
 * @param  {Error} err - error object.
 * @return {EmptyObservable} - empty observable sequence.
 */
function logResolveError (err) {
  status.complete()
  status.clear()
  console.error(err)
  status.draw()
  return EmptyObservable.create()
}

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
 * resolve all dependencies starting at the current working directory.
 * 
 * @param  {String} cwd - current working directory.
 * @return {Observable} - an observable sequence of resolved dependencies.
 */
export function resolveAll (cwd) {
  const targets = Object.create(null)

  return this::expand(({ target, pkgJSON }) => {
    if (target in targets) return EmptyObservable.create()
    targets[target] = true

    const isEntry = target === cwd
    const fields = isEntry ? ENTRY_DEPENDENCY_FIELDS : DEPENDENCY_FIELDS
    return extractDependencies(pkgJSON, fields)::_do(logResolving)
      ::resolve(cwd, target)::_catch(logResolveError)::_do(logResolved)
  })
  ::_finally(status.clear)
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

/**
 * download the tarball of the package into the `target` path.
 * @param {Dep} dep - dependency to be fetched.
 * @return {Observable} - an empty observable sequence that will be completed
 * once the dependency has been downloaded.
 */
export function fetch ({target, pkgJSON: {dist: {tarball, shasum}}}) {
  // console.log('fetch', target, tarball)
  return EmptyObservable.create()
  // return download(tarball)
}

/**
 * download the tarballs into their respective `target`.
 * @return {Observable} - an empty observable sequence that will be completed
 * once all dependencies have been downloaded.
 */
export function fetchAll () {
  return this::distinctKey('target')
    ::mergeMap(fetch)
}

/**
 * write the package.json package root JSON documents into their respective
 * target paths.
 * @param  {Deo} dep - dependency to be persisted to disk.
 * @return {Observable} - an observable sequence that will be completed once
 * the `package.json` has been written to disk.
 */
export function writePkgJSON ({target, pkgJSON}) {
  const raw = JSON.stringify(pkgJSON, null, 2)
  const file = path.join(target, 'package.json')
  const o = util.writeFile(file, raw, 'utf8')
  return o::_catch((err) => {
    switch (err.code) {
      case 'ENOENT':
        return util.mkdirp(target)::concat(o)
      default:
        throw err
    }
  })
}

export function writeAllPkgJSONs () {
  return this::distinctKey('target')
    ::mergeMap(writePkgJSON)
}

/**
 * run the installation command.
 * @param  {String} cwd - current working directory (absolute path).
 * @param  {Object} argv - parsed command line arguments.
 * @return {Observable} - an observable sequence that will be completed once
 * the installation is complete.
 */
export default function installCmd (cwd, argv) {
  const explicit = !!(argv._.length - 1)
  const updatedPkgJSONs = explicit
    ? EntryDep.fromArgv(cwd, argv)
    : EntryDep.fromFS(cwd)

  const resolved = updatedPkgJSONs
    ::resolveAll(cwd)::skip(1)::share()

  return EmptyObservable.create()
    ::merge(resolved::fetchAll())
    ::merge(resolved::linkAll())
    ::merge(resolved::writeAllPkgJSONs())
}
