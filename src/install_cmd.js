'use strict'

import { Observable } from 'rxjs/Observable'
import path from 'path'
import { readFileJSON, writeFile } from './util'
import log from 'a-logger'
import zipObject from 'lodash.zipobject'
import xtend from 'xtend'
import { resolve } from './registry'

import { map } from 'rxjs/operator/map'
import { expand } from 'rxjs/operator/expand'
import { reduce } from 'rxjs/operator/reduce'
import { mergeMap } from 'rxjs/operator/mergeMap'
import { concat } from 'rxjs/operator/concat'
import { _do } from 'rxjs/operator/do'
import { letProto } from 'rxjs/operator/let'
import { ArrayObservable } from 'rxjs/observable/ArrayObservable'
import { ErrorObservable } from 'rxjs/observable/ErrorObservable'

function updatePkgJSON (argv) {
  return function (o) {
    return o::map((outdatedPkgJSON) => {
      // don't update when no additional dependencies have been defined
      const newDepNames = argv._
      if (!newDepNames.length) return outdatedPkgJSON

      // parse dependencies and version strings declared via argv
      const newDeps = zipObject(newDepNames.map((target) => {
        const nameVersion = /^(@?.+?)(?:@(.+)?)?$/.exec(target)
        return [ nameVersion[1], nameVersion[2] || '*' ]
      }))

      // update pkgJSON.dependencies or pkgJSON.devDependencies
      const diff = argv.saveDev
        ? { devDependencies: xtend(outdatedPkgJSON.devDependencies || {}, newDeps) }
        : { dependencies: xtend(outdatedPkgJSON.dependencies || {}, newDeps) }

      return xtend(outdatedPkgJSON, diff)
    })
  }
}

function catchReadPkgJSON (o) {
  return o.catch((err) => {
    switch (err.code) {
      case 'ENOENT':
        log.warn('Missing package.json')
        return ArrayObservable.of({})
      default:
        log.error('Failed to read package.json')
        return ErrorObservable.create(err)
    }
  })
}

function reduceDeps (baseDir) {
  return function (o) {
    return o::reduce((allLinks, { pkgJSON, parentPkgJSON, depth }) => {
      switch (depth) {
        case 0:
          break
        case 1:
          allLinks[path.join(baseDir, pkgJSON.name)] =
            path.join(baseDir, pkgJSON.dist.shasum, 'package')
          break
        default:
          allLinks[path.join(baseDir, parentPkgJSON.dist.shasum, 'node_modules', pkgJSON.name)] =
            path.join(baseDir, pkgJSON.dist.shasum, 'package')
          break
      }
      return allLinks
    }, Object.create(null))
  }
}

function expandDeps (baseDir) {
  return function (o) {
    return o::expand(({ pkgJSON: parentPkgJSON, depth: parentDepth }) => {
      const allDependencies = parentDepth
        ? (parentPkgJSON.dependencies || {})
        : xtend(
          parentPkgJSON.dependencies || {},
          parentPkgJSON.devDependencies || {})

      return Observable.pairs(allDependencies)
        ::letProto(resolve)
        ::map((pkgJSON) => ({
          parentPkgJSON,
          pkgJSON,
          depth: parentDepth + 1
        }))
    })
  }
}

function installCmd (cwd, argv) {
  const baseDir = path.join(cwd, 'node_modules')
  const pkgJSONPath = path.join(cwd, 'package.json')

  const localPkgJSON = readFileJSON(pkgJSONPath)
    ::letProto(catchReadPkgJSON)

  console.log(argv)

  const updatedPkgJSON = localPkgJSON
    ::letProto(updatePkgJSON(argv))

  const expanded = updatedPkgJSON
    ::map((pkgJSON) => ({ pkgJSON, depth: 0 }))
    // ::letProto(expandDeps(baseDir))
    // ::_do(({ pkgJSON }) =>
    //   log.info(`expanded ${pkgJSON.name}@${pkgJSON.version}`))

  // const reduced = expanded
  //   ::letProto(reduceDeps(baseDir))
  //   ::_do((allLinks) =>
  //     log.info('fetched all dependencies', allLinks))

  const linked = expanded

  const shouldSaveUpdatedPkgJSON = argv.saveDev || argv.save
  const savedUpdatedPkgJSON = updatedPkgJSON::mergeMap((pkgJSON) =>
    writeFile(pkgJSONPath, JSON.stringify(pkgJSON, null, '\t'), 'utf8'))

  return shouldSaveUpdatedPkgJSON
    ? linked::concat(savedUpdatedPkgJSON)
    : linked
}

module.exports = installCmd
