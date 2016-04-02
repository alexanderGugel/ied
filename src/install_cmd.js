import path from 'path'
import xtend from 'xtend'
import {ArrayObservable} from 'rxjs/observable/ArrayObservable'
import {EmptyObservable} from 'rxjs/observable/EmptyObservable'
import {_do} from 'rxjs/operator/do'
import {distinctKey} from 'rxjs/operator/distinctKey'
import {expand} from 'rxjs/operator/expand'
import {map} from 'rxjs/operator/map'
import {mergeMap} from 'rxjs/operator/mergeMap'
import {merge} from 'rxjs/operator/merge'
import {share} from 'rxjs/operator/share'
import {skip} from 'rxjs/operator/skip'

import * as cache from './fs_cache'
import * as registry from './registry'
import {EntryDep} from './entry_dep'
import {Dep} from './dep'
import {download} from './tarball'
import {forceSymlink} from './util'
import status from './status'

function resolve (cwd, target) {
  return this
    ::_do(_logPreResolve)
    ::mergeMap(([name, version]) =>
      registry.resolve(name, version)::map((pkgJSON) => new Dep({
        pkgJSON,
        target: path.join(cwd, 'node_modules', pkgJSON.dist.shasum),
        path: path.join(target, 'node_modules', name)
      }))
    )
    ::_do(_logPostResolve)
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
function getAllDependencies (pkgJSON, fields) {
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

function _logPreResolve ([name, version]) {
  status.update(`resolving ${name}@${version}`).start()
}

function _logPostResolve ({pkgJSON: {name, version, dist: {shasum}}}) {
  status.update(`resolved ${name}@${version} [${shasum.substr(0, 7)}]`).complete()
}

export const ENTRY_DEPENDENCY_FIELDS = ['dependencies', 'devDependencies']
export const DEPENDENCY_FIELDS = ['dependencies']

/**
 * resolve all dependencies starting at the current working directory.
 * 
 * @param  {String} cwd - current working directory.
 * @return {Observable} - an observable sequence of resolved dependencies.
 */
function resolveAll (cwd) {
  const targets = Object.create(null)

  return this::expand(({ target, pkgJSON }) => {
    if (target in targets) {
      return EmptyObservable.create()
    }
    targets[target] = true

    const isEntry = target === cwd
    const fields = isEntry ? ENTRY_DEPENDENCY_FIELDS : DEPENDENCY_FIELDS
    return getAllDependencies(pkgJSON, fields)::resolve(cwd, target)
  })
}

/**
 * create a relative symbolic link to a dependency.
 * @param {Dep} dep - dependency to be linked.
 * @return {Observable} - an empty observable sequence that will be completed
 * once the symbolic link has been created.
 */
function link ({ path: absPath, target: absTarget }) {
  const relTarget = path.relative(absPath, absTarget)
  return forceSymlink(relTarget, absPath)
}

/**
 * symlink the intermediate results of the underlying observable sequence
 * @return {Observable} - an empty observable sequence that will be completed
 * once all dependencies have been symlinked.
 */
function linkAll () {
  return this::distinctKey('path')::mergeMap(link)
}

/**
 * download the tarball of the package into the `target` path.
 * @param {Dep} dep - dependency to be fetched.
 * @return {Observable} - an empty observable sequence that will be completed
 * once the dependency has been downloaded.
 */
function fetch ({target, pkgJSON: {dist: {tarball, shasum}}}) {
  // console.log('fetch', target, tarball)
  return EmptyObservable.create()
  // return download(tarball)
}

/**
 * download the tarballs into their respective `target`.
 * @return {Observable} - an empty observable sequence that will be completed
 * once all dependencies have been downloaded.
 */
function fetchAll () {
  return this::distinctKey('target')::mergeMap(fetch)
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
    // ::merge(resolved::fetchAll())
    ::merge(resolved::linkAll())
}
