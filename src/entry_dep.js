import path from 'path'
import {ScalarObservable} from 'rxjs/observable/ScalarObservable'
import {_catch} from 'rxjs/operator/catch'
import {map} from 'rxjs/operator/map'
import {readFileJSON} from './util'
import fromPairs from 'lodash.frompairs'

/**
 * create an instance by reading a `package.json` from disk.
 * @param  {String} cwd - current working directory.
 * @return {Observabel} - an observable sequence of an `EntryDep`.
 */
export function fromFS (cwd) {
  const filename = path.join(cwd, 'package.json')
  return readFileJSON(filename)
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
export function fromArgv (cwd, argv) {
  const pkgJSON = parseArgv(argv)
  const entryDep = { pkgJSON, target: cwd }
  return ScalarObservable.create(entryDep)
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

  const key = argv.saveDev
    ? 'devDependencies'
    : 'dependencies'

  const pkgJSON = {
    [key]: nameVersionPairs
  }
  return pkgJSON
}
