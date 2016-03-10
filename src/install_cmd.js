'use strict'

import { Observable } from 'rxjs/Observable'
import path from 'path'
import { readFileJSON, writeFile } from './util'
import log from 'a-logger'
import zipObject from 'lodash.zipobject'
import xtend from 'xtend'
import { resolve } from './registry'

import 'rxjs/add/operator/map'
import 'rxjs/add/operator/let'
import 'rxjs/add/operator/expand'
import 'rxjs/add/operator/do'
import 'rxjs/add/operator/reduce'
import 'rxjs/add/operator/mergeMap'

function updatePkgJSON (argv) {
  return function (o) {
    return o.map((outdatedPkgJSON) => {
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
        return Observable.return({})
      default:
        log.error('Failed to read package.json')
        return Observable.throw(err)
    }
  })
}

function reduce (baseDir) {
  return function (o) {
    return o.reduce((allLinks, { pkgJSON, parentPkgJSON, depth }) => {
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

function expand (baseDir) {
  return function (o) {
    return o.expand(({ pkgJSON: parentPkgJSON, depth: parentDepth }) => {
      const allDependencies = parentDepth
        ? (parentPkgJSON.dependencies || {})
        : xtend(
          parentPkgJSON.dependencies || {},
          parentPkgJSON.devDependencies || {})

      return Observable.pairs(allDependencies)
        .let(resolve)
        .map((pkgJSON) => ({
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

  const localPkgJSON = readFileJSON(pkgJSONPath).let(catchReadPkgJSON)
  const updatedPkgJSON = localPkgJSON.let(updatePkgJSON(argv))

  const expanded = updatedPkgJSON
    .map((pkgJSON) => ({ pkgJSON, depth: 0 }))
    .let(expand(baseDir))
    .do(({ pkgJSON }) =>
      log.info(`expanded ${pkgJSON.name}@${pkgJSON.version}`))

  const reduced = expanded
    .let(reduce(baseDir))
    .do((allLinks) =>
      log.info('fetched all dependencies', allLinks))

  const linked = reduced

  const shouldSaveUpdatedPkgJSON = argv.saveDev || argv.save
  const savedUpdatedPkgJSON = updatedPkgJSON.mergeMap((pkgJSON) =>
    writeFile(pkgJSONPath, JSON.stringify(pkgJSON, null, '\t'), 'utf8'))

  return shouldSaveUpdatedPkgJSON
    ? Observable.concat(linked, savedUpdatedPkgJSON)
    : linked
}

module.exports = installCmd
