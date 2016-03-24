import path from 'path'
import {forceSymlink, download, rename} from './util'
import * as cache from './cache'
import {_catch} from 'rxjs/operator/catch'
import {mergeMap} from 'rxjs/operator/mergeMap'
import assert from 'assert'
import objectEntries from 'object.entries'
import {ArrayObservable} from 'rxjs/observable/ArrayObservable'

/**
 * class representing a "local" version of a possibly installed package (e.g.
 * during the installation procedure).
 */
export class Dep {
  /**
   * create instance.
   * @param  {Object} [options.pkgJSON] - an object
   * representing a `package.json` file.
   * @param  {String} [options.target] - where the package has **actually**
   * been installed into.
   * @param  {String} [options.path] - path of the symlink pointing to the
   * (possibly relative) `target`.
   */
  constructor ({pkgJSON, target, path}) {
    this.pkgJSON = pkgJSON
    this.target = target
    this.path = path
  }

  /**
   * extract dependencies as an observable sequence of `[name, version]` tuples.
   * @return {ArrayObservable} - observable sequence of `[name, version]` pairs.
   */
  get subDependencies () {
    const entries = objectEntries(this.pkgJSON.dependencies || {})
    return ArrayObservable.create(entries)  
  }
}
