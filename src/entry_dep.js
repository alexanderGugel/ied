import path from 'path'
import {ScalarObservable} from 'rxjs/observable/ScalarObservable'
import {_catch} from 'rxjs/operator/catch'
import {map} from 'rxjs/operator/map'
import {readFileJSON} from './util'
import fromPairs from 'lodash.frompairs'
import {Dep} from './dep'

/**
 * class used for creating `package.json` files with neutral behavior
 * (e.g. in case of an `ENOENT`).
 */
export class NullPkgJSON {
  /**
   * create instance.
   * @param  {Object} [options.dependencies = {}] - dependencies.
   * @param  {Object} [devDependencies = {}] - development dependencies.
   */
  constructor ({dependencies = {}, devDependencies = {}} = {}) {
    this.dependencies = dependencies
    this.devDependencies = devDependencies
  }
}

/**
 * class representing an entry, project level `package.json` file.
 */
export class EntryDep extends Dep {
  /**
   * create an instance by reading a `package.json` from disk.
   * @param  {String} cwd - current working directory.
   * @return {Observabel} - an observable sequence of an `EntryDep`.
   */
  static fromFS (cwd) {
    const filename = path.join(cwd, 'package.json')
    return readFileJSON(filename)
      ::EntryDep.catchReadFileJSON()
      ::map((pkgJSON) => new EntryDep({pkgJSON, target: cwd}))
  }

  /**
   * create an instance by parsing the explicit dependencies supplied via
   * command line arguments.
   * @param  {String} cwd - current working directory.
   * @param  {Array} argv - command line arguments.
   * @return {Observabel} - an observable sequence of an `EntryDep`.
   */
  static fromArgv (cwd, argv) {
    const pkgJSON = EntryDep.parseArgv(argv)
    const entryDep = new EntryDep({pkgJSON, target: cwd})
    return ScalarObservable.create(entryDep)
  }

  /**
   * gracefully handle `ENOENT` errors when running the install command in
   * projects that don't include a `package.json` file.
   * @return {Observable} - an observable sequence of object representing
   * `package.json` files.
   */
  static catchReadFileJSON () {
    return this::_catch((err) => {
      switch (err.code) {
        case 'ENOENT':
          // emit an empty `package.json` file
          const pkgJSON = new NullPkgJSON()
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
  static parseArgv (argv) {
    const names = argv._.slice(1)

    const nameVersionPairs = fromPairs(names.map((target) => {
      const nameVersion = /^(@?.+?)(?:@(.+)?)?$/.exec(target)
      return [nameVersion[1], nameVersion[2] || '*']
    }))

    const key = argv.saveDev
      ? 'devDependencies'
      : 'dependencies'
    const pkgJSON = new NullPkgJSON({[key]: nameVersionPairs})
    return pkgJSON
  }
}
