import path from 'path'
import {EmptyObservable} from 'rxjs/observable/EmptyObservable'
import {ScalarObservable} from 'rxjs/observable/ScalarObservable'
import {_do} from 'rxjs/operator/do'
import {_catch} from 'rxjs/operator/catch'
import {concat} from 'rxjs/operator/concat'
import {filter} from 'rxjs/operator/filter'
import {merge} from 'rxjs/operator/merge'
import {publishReplay} from 'rxjs/operator/publishReplay'
import {skip} from 'rxjs/operator/skip'
import {map} from 'rxjs/operator/map'
import fromPairs from 'lodash.frompairs'

import * as install from './install'
import * as fsCache from './fs_cache'
import * as util from './util'

/**
 * create an instance by reading a `package.json` from disk.
 * @param  {String} cwd - current working directory.
 * @return {Observabel} - an observable sequence of an `EntryDep`.
 */
export function initFromFs (cwd) {
  const filename = path.join(cwd, 'package.json')
  return util.readFileJSON(filename)
    ::catchReadFileJSON()
    ::map((pkgJSON) => ({pkgJSON, target: cwd}))
}

/**
 * create an instance by parsing the explicit dependencies supplied via
 * command line arguments.
 * @param  {String} cwd - current working directory.
 * @param  {Array} argv - command line arguments.
 * @return {Observabel} - an observable sequence of an `EntryDep`.
 */
export function initFromArgv (cwd, argv) {
  const pkgJSON = parseArgv(argv)
  return ScalarObservable.create({ pkgJSON, target: cwd })
}

/**
 * gracefully handle `ENOENT` errors when running the install command in
 * projects that don't include a `package.json` file.
 * @return {Observable} - an observable sequence of object representing
 * `package.json` files.
 */
export function catchReadFileJSON () {
  return this::_catch((err) => {
    switch (err.code) {
      case 'ENOENT':
        // emit an empty `package.json` file
        const pkgJSON = {}
        return ScalarObservable.create(pkgJSON)
      default:
        throw err
    }
  })
}

/**
 * parse the command line arguments and create a `package.json` file from it.
 * @param  {Array} argv - command line arguments.
 * @return {NullPkgJSON} - package.json created from explicit dependencies
 * supplied via command line arguments.
 */
export function parseArgv (argv) {
  const names = argv._.slice(1)

  const nameVersionPairs = fromPairs(names.map((target) => {
    const nameVersion = /^(@?.+?)(?:@(.+)?)?$/.exec(target)
    return [nameVersion[1], nameVersion[2] || '*']
  }))

  const key = argv.saveDev ? 'devDependencies' : 'dependencies'
  return { [key]: nameVersionPairs }
}

/**
 * run the installation command.
 * @param  {String} cwd - current working directory (absolute path).
 * @param  {Object} argv - parsed command line arguments.
 * @return {Observable} - an observable sequence that will be completed once
 * the installation is complete.
 */
export default function installCmd (cwd, argv) {
  const isExplicit = argv._.length - 1
  const updatedPkgJSONs = isExplicit
    ? initFromArgv(cwd, argv)
    : initFromFs(cwd)

  const resolved = updatedPkgJSONs
    ::install.resolveAll(cwd)::skip(1)
    ::filter(({ local }) => !local)
    ::publishReplay().refCount()

  const linked = resolved::install.linkAll()
  const fetched = resolved::install.fetchAll()

  // only build if we're asked to.
  const built = argv.build
    ? resolved::install.buildAll()
    : EmptyObservable.create()

  const initialized = util.mkdirp(path.join(cwd, 'node_modules'))

  return fsCache.init()::concat(initialized)
    ::concat(fetched)::concat(linked)::concat(built).subscribe()
}
