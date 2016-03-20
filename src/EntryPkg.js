import path from 'path'
import {NullPkgJSON} from './NullPkgJSON'
import {AbstractPkg} from './AbstractPkg'
import {ArrayObservable} from 'rxjs/observable/ArrayObservable'
import {ErrorObservable} from 'rxjs/observable/ErrorObservable'
import {ScalarObservable} from 'rxjs/observable/ScalarObservable'
import {_catch} from 'rxjs/operator/catch'
import {map} from 'rxjs/operator/map'
import {readFileJSON} from './util'
import fromPairs from 'lodash.frompairs'

/**
 * class representing an entry, project level `package.json` file.
 */
export class EntryPkg extends AbstractPkg {
  /**
   * create an instance by reading a `package.json` from disk.
   * @param  {String} cwd - current working directory.
   * @return {Observabel} - an observable sequence of an `EntryPkg`.
   */
  static fromFS (cwd) {
    const filename = path.join(cwd, 'package.json')
    return readFileJSON(filename)
      ::EntryPkg.catchReadFileJSON()
      ::map((pkgJSON) => new EntryPkg({pkgJSON, target: cwd}))
  }

  /**
   * create an instance by parsing the explicit dependencies supplied via
   * command line arguments.
   * @param  {String} cwd - current working directory.
   * @param  {Array} argv - command line arguments.
   * @return {Observabel} - an observable sequence of an `EntryPkg`.
   */
  static fromArgv (cwd, argv) {
    const target = cwd
    const pkgJSON = EntryPkg.parseArgv(argv)
    const entryPkg = new EntryPkg({pkgJSON, target})
    return ScalarObservable.create(entryPkg)
  }

  /**
   * gracefully handle `ENOENT` errors when running the install command in
   * projects that don't include a `package.json` file.
   * @private
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
          return ErrorObservable.create(err)
      }
    })
  }

  /**
   * parse the command line arguments and create a `package.json` file from it.
   * @private
   * @param  {Array} argv - command line arguments
   * @return {NullPkgJSON} - package.json created from explicit dependencies
   * supplied via command line arguments
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
