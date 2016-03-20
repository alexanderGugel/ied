import path from 'path'
import {forceSymlink} from './util'
import {fetch} from './fetch'
import {AbstractPkg} from './AbstractPkg'

/**
 * class representing a "local" version of a possibly installed package (e.g.
 * during the installation procedure).
 */
export class Pkg extends AbstractPkg {
  /**
   * download the tarball of the package into the `target` path.
   * @return {Observable} - an empty observable sequence that will be completed
   * once the dependency has been downloaded.
   */
  fetch () {
    const {target, pkgJSON: {dist: {tarball, shasum}}} = this
    return fetch(target, tarball, shasum)
  }

  /**
   * create a relative symbolic link.
   * @return {Observable} - an empty observable sequence that will be completed
   * once the symbolic link has been created.
   */
  link () {
    const {path: _path, target} = this
    const relTarget = path.relative(_path, target)
    return forceSymlink(relTarget, _path)
  }
}
