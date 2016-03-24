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

  /**
   * download the tarball of the package into the `target` path.
   * @return {Observable} - an empty observable sequence that will be completed
   * once the dependency has been downloaded.
   */
  fetch () {
    const {target, pkgJSON: {dist: {tarball, shasum}}} = this
    return cache.extract(target, shasum)
      ::_catch((err) => err.code === 'ENOENT'
        ? download(tarball)
        : ErrorObservable.create(err)
      )
      // ::mergeMap(({ shasum: actualShasum, stream }) => {
      //   console.log(actualShasum.digest('hex'))
      //   // assert.equal(shasum, actualShasum.digest('hex'))
      //   return rename(stream.path, target)
      // })
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
