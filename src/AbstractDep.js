import {EmptyObservable} from 'rxjs/observable/EmptyObservable'
import {NullPkgJSON} from './NullPkgJSON'

/**
 * Abstract dependency class with neutral behavior.
 */
export class AbstractDep {
  /**
   * create instance.
   * @param  {Object} [options.pkgJSON = new NullPkgJSON()] - an object
   * representing a `package.json` file.
   * @param  {String} [options.target] - where the package has **actually**
   * been installed into.
   * @param  {String} [options.path] - path of the symlink pointing to the
   * (possibly relative) `target`.
   */
  constructor ({pkgJSON = new NullPkgJSON(), target, path}) {
    this.pkgJSON = pkgJSON
    this.target = target
    this.path = path
  }

  /**
   * download the dependency into its `target`.
   * @return {EmptyObservable} - an empty observable sequence.
   */
  fetch () {
    return EmptyObservable.create()
  }

  /**
   * create a symbolic link that exposes the dependency.
   * @return {EmptyObservable} - an empty observable sequence.
   */
  link () {
    return EmptyObservable.create()
  }
}
