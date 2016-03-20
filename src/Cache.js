import {Observable} from 'rxjs/Observable'
import gunzip from 'gunzip-maybe'
import tar from 'tar-fs'
import fs from 'fs'
import path from 'path'
import uuid from 'node-uuid'
import {mkdirp} from './util'

/**
 * File system based cache (without predefined eviction strategy).
 */
export class Cache {
  /**
   * instantiate a new view into a (possibly preexisting) cache.
   * @param  {String} dir - base directory of the cache.
   */
  constructor (dir) {
    this.dir = dir
  }

  /**
   * initialize the cache.
   * @return {Observable} - an observable sequence that will be completed once
   * the base directory of the cache has been created.
   */
  init () {
    return mkdirp(this.dir)
  }

  /**
   * open a write stream into a temporarily cached file for caching a new
   * package.
   * @return {WriteStream}    Write Stream
   */
  write () {
    const filename = path.join(this.dir, '.tmp', uuid())
    return fs.WriteStream(filename)
  }

  /**
   * open a read stream to a cached dependency.
   * @param  {String} shasum - shasum (unique identifier) of the cached tarball.
   * @return {ReadStream} - Read Stream
   */
  read (shasum) {
    const filename = path.join(this.dir, shasum)
    return fs.ReadStream(filename)
  }

  /**
   * fetch a dependency from the cache.
   * @param {String} dest - pathname into which the cached dependency should be
   * extracted.
   * @param {String} shasum - shasum (unique identifier) of the cached tarball.
   * @return {Observable} - observable sequence that will be completed once
   * the cached dependency has been fetched.
   */
  fetch (dest, shasum) {
    return Observable.create((observer) => {
      const finHandler = () => observer.complete()
      const errHandler = (err) => observer.error(err)

      const untar = tar.extract(dest, {strip: 1})
      this.read(shasum).on('error', errHandler)
        .pipe(gunzip()).on('error', errHandler)
        .pipe(untar).on('error', errHandler)
        .on('finish', finHandler)
    })
  }
}
