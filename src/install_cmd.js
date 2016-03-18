import { Observable } from 'rxjs/Observable'
import path from 'path'
import { readFileJSON, writeFile, stat, readlink, forceSymlink } from './util'
import log from 'a-logger'
import fromPairs from 'lodash.frompairs'
import xtend from 'xtend'
import { resolve } from './registry'
import objectEntries from 'object.entries'
import fetch from './fetch'

import { map } from 'rxjs/operator/map'
import { expand } from 'rxjs/operator/expand'
import { reduce } from 'rxjs/operator/reduce'
import { mergeMap } from 'rxjs/operator/mergeMap'
import { filter } from 'rxjs/operator/filter'
import { skip } from 'rxjs/operator/skip'
import { _do } from 'rxjs/operator/do'
import { share } from 'rxjs/operator/share'
import { merge } from 'rxjs/operator/merge'
import { distinct } from 'rxjs/operator/distinct'
import { _catch } from 'rxjs/operator/catch'
import { ArrayObservable } from 'rxjs/observable/ArrayObservable'
import { ErrorObservable } from 'rxjs/observable/ErrorObservable'
import { EmptyObservable } from 'rxjs/observable/EmptyObservable'

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

function catchReadPkgJSONs () {
  return this::_catch((err) => {
    switch (err.code) {
      case 'ENOENT':
        return ArrayObservable.of({})
      default:
        return ErrorObservable.create(err)
    }
  })
}

function saveUpdatedPkgJSON (pkgJSONPath) {
  return this::mergeMap((pkgJSON) =>
    writeFile(pkgJSONPath, JSON.stringify(pkgJSON, null, 2) + '\n', 'utf8')
  )
}

function getNameVersionPairs (pkgJSON, isEntry) {
  const { dependencies, devDependencies } = pkgJSON
  const allDependencies = xtend(
    dependencies, isEntry ? devDependencies : {}
  )
  const nameVersionPairs = ArrayObservable.create(
    objectEntries(allDependencies)
  )
  return nameVersionPairs
}

function resolvePkgJSONs (cwd) {
  const targets = Object.create(null)

  return this
    ::map((pkgJSON) => ({ pkgJSON, target: cwd }))
    ::expand(({ pkgJSON, target }) => {
      if (target in targets) return EmptyObservable.create()
      targets[target] = true

      // Also install devDependencies of entry dependency.
      const isEntry = target === cwd
      const nameVersionPairs = getNameVersionPairs(pkgJSON, isEntry)

      return nameVersionPairs::mergeMap(([ name, version ]) =>
        resolve(name, version)::map((pkgJSON) => ({
          pkgJSON,
          target: path.join(cwd, 'node_modules', pkgJSON.dist.shasum),
          path: path.join(target, 'node_modules', name)
        }))
      )
    })
}

function makePathsRelative () {
  return this::map((result) => xtend(result, {
    path: result.path,
    target: result.path && path.relative(result.path, result.target)
  }))
}

function logSymlinking () {
  return this::_do(([_path, target]) => {
    const relativePath = path.relative(
      path.join(process.cwd(), 'node_modules'), _path
    )
    log.debug(`symlinking ${relativePath}\n\t-> ${target}`)
  })
}

function logResolved () {
  return this::_do(({target, pkgJSON: {name, version}}) =>
    log.debug(`resolved ${path.basename(target)}: ${name}@${version}`)
  )
}

function symlinkPkgJSONs () {
  const acc = Object.create(null)

  return this::reduce((acc, {target, path}) =>
    xtend(acc, {[path]: target}), acc
  )
  ::mergeMap((allSymlinks) =>
    ArrayObservable.create(objectEntries(allSymlinks))
      ::logSymlinking()
      ::mergeMap(([path, target]) => forceSymlink(target, path))
  )
}

function fetchPkgJSONs () {
  return this::mergeMap(({ pkgJSON, target }) =>
    fetch(target, pkgJSON.dist.tarball, pkgJSON.dist.shasum)
  )
}

function installCmd (cwd, argv) {
  const baseDir = path.join(cwd, 'node_modules')
  const pkgJSONPath = path.join(cwd, 'package.json')

  const updatedPkgJSONs = readFileJSON(pkgJSONPath)
    ::catchReadPkgJSONs()
    ::updatePkgJSONs(argv)
    ::share()

  const resolvedPkgJSONs = updatedPkgJSONs
    ::resolvePkgJSONs(cwd)
    ::skip(1)
    ::share()

  const relativeResolvedPkgJSONs = resolvedPkgJSONs
    ::makePathsRelative()
    ::logResolved()

  const fetchedPkgJSONs = resolvedPkgJSONs
    ::fetchPkgJSONs()

  const symlinkedPkgJSONs = relativeResolvedPkgJSONs
    ::symlinkPkgJSONs()

  const fetchedAndSymlinkedPkgJSONs = fetchedPkgJSONs
    ::merge(symlinkedPkgJSONs)

  const shouldSaveUpdatedPkgJSON = argv.saveDev || argv.save
  if (!shouldSaveUpdatedPkgJSON) {
    return fetchedAndSymlinkedPkgJSONs
  }

  const savedUpdatedPkgJSON = updatedPkgJSONs
    ::saveUpdatedPkgJSON(pkgJSONPath)

  return fetchedAndSymlinkedPkgJSONs
    ::merge(savedUpdatedPkgJSON)
}

module.exports = installCmd
