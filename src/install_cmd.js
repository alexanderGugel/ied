import {Observable} from 'rxjs/Observable'
import path from 'path'
import {readFileJSON, writeFile, stat, readlink, forceSymlink} from './util'
import log from 'a-logger'
import fromPairs from 'lodash.frompairs'
import xtend from 'xtend'
import {resolve} from './registry'
import objectEntries from 'object.entries'
import fetch from './fetch'

import {map} from 'rxjs/operator/map'
import {expand} from 'rxjs/operator/expand'
import {distinct} from 'rxjs/operator/distinct'
import {distinctKey} from 'rxjs/operator/distinctKey'
import {mergeMap} from 'rxjs/operator/mergeMap'
import {filter} from 'rxjs/operator/filter'
import {skip} from 'rxjs/operator/skip'
import {concatMap} from 'rxjs/operator/concatMap'
import {_do} from 'rxjs/operator/do'
import {share} from 'rxjs/operator/share'
import {merge} from 'rxjs/operator/merge'
import {_catch} from 'rxjs/operator/catch'
import {ArrayObservable} from 'rxjs/observable/ArrayObservable'
import {EmptyObservable} from 'rxjs/observable/EmptyObservable'

import {EntryDep} from './entry_dep'
import {Dep} from './dep'

function logSymlinking () {
  return this::_do(([_path, target]) => {
    const relativePath = path.relative(
      path.join(process.cwd(), 'node_modules'), _path
    )
    log.debug(`symlinking ${relativePath}\n\t-> ${target}`)
  })
}

function logResolved () {
  return this::_do(({target, pkgJSON: {name, version}}) => {
    const basename = path.basename(target)
    log.debug(`resolved ${basename}: ${name}@${version}`)
  })
}

function updatePkgJSONs (argv) {
  return this::map((outdatedPkgJSON) => {
    const newDepNames = argv._.slice(1)
    if (!newDepNames.length) return outdatedPkgJSON

    const newDeps = fromPairs(newDepNames.map((target) => {
      const nameVersion = /^(@?.+?)(?:@(.+)?)?$/.exec(target)
      return [ nameVersion[1], nameVersion[2] || '*' ]
    }))

    const diff = argv.saveDev
      ? { devDependencies: xtend(outdatedPkgJSON.devDependencies || {}, newDeps) }
      : { dependencies: xtend(outdatedPkgJSON.dependencies || {}, newDeps) }

    return xtend(outdatedPkgJSON, diff)
  })
}

function saveUpdatedPkgJSON (cwd) {
  const filename = path.join(cwd, 'package.json')
  return this::mergeMap((pkgJSON) =>
    writeFile(filename, JSON.stringify(pkgJSON, null, 2) + '\n', 'utf8')
  )
}

function resolveAll (cwd) {
  const targets = Object.create(null)

  return this::expand((dep) => {
    if (dep.target in targets) {
      return EmptyObservable.create()
    }
    targets[dep.target] = true

    return (dep.subDependencies)::mergeMap(([ name, version ]) =>
      resolve(name, version)::map((pkgJSON) => new Dep({
        pkgJSON,
        target: path.join(cwd, 'node_modules', pkgJSON.dist.shasum),
        path: path.join(dep.target, 'node_modules', name)
      }))
    )
  })
    ::logResolved()
}

/**
 * create a relative symbolic link to a dependency.
 * @param {Dep} dep - dependency to be linked.
 * @return {Observable} - an empty observable sequence that will be completed
 * once the symbolic link has been created.
 */
function link (dep) {
  const relTarget = path.relative(dep.path, dep.target)
  return forceSymlink(relTarget, dep.path)
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
static fetch (dep) {
  return this
  // const {target, pkgJSON: {dist: {tarball, shasum}}} = this
  // return cache.extract(target, shasum)
  //   ::_catch((err) => err.code === 'ENOENT'
  //     ? download(tarball)
  //     : ErrorObservable.create(err)
  //   )
  // ::mergeMap(({ shasum: actualShasum, stream }) => {
  //   console.log(actualShasum.digest('hex'))
  //   // assert.equal(shasum, actualShasum.digest('hex'))
  //   return rename(stream.path, target)
  // })
}

/**
 * download the tarballs into their respective `target`.
 * @return {Observable} - an empty observable sequence that will be completed
 * once all dependencies have been downloaded.
 */
function fetchAll () {
  return this::distinctKey('target')::mergeMap(Dep.fetch)
}

/**
 * run the installation command.
 * @param  {String} cwd - current working directory (absolute path).
 * @param  {Object} argv - parsed command line arguments.
 * @return {Observable} - an observable sequence that will be completed once the
 * installation is complete.
 */
export default function installCmd (cwd, argv) {
  const baseDir = path.join(cwd, 'node_modules')
  const explicit = !!(argv._.length - 1)

  const updatedPkgJSONs = explicit
    ? EntryDep.fromArgv(cwd, argv)
    : EntryDep.fromFS(cwd)

  const resolved = updatedPkgJSONs
    ::resolveAll(cwd)::share()

  const fetched = resolved::skip(1)::fetchAll()
  const linked = resolved::skip(1)::linkAll()

  return EmptyObservable.create()
    ::merge(linked)::merge(fetched)
}
