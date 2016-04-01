import {Observable} from 'rxjs/Observable'
import gunzip from 'gunzip-maybe'
import tar from 'tar-fs'
import fs from 'fs'
import path from 'path'
import uuid from 'node-uuid'
import {mkdirp} from './util'
import * as config from './config'

/**
 * initialize the cache.
 * @return {Observable} - an observable sequence that will be completed once
 * the base directory of the cache has been created.
 */
export function init () {
  return mkdirp(config.cacheDir)
}

/**
 * open a write stream into a temporarily cached file for caching a new
 * package.
 * @return {WriteStream} - Write Stream
 */
export function write () {
  const filename = path.join(config.cacheDir, '.tmp', uuid.v4())
  return fs.WriteStream(filename)
}

/**
 * open a read stream to a cached dependency.
 * @param  {String} shasum - shasum (unique identifier) of the cached tarball.
 * @return {ReadStream} - Read Stream
 */
export function read (shasum) {
  const filename = path.join(config.cacheDir, shasum)
  return fs.ReadStream(filename)
}

/**
 * extract a dependency from the cache.
 * @param {String} dest - pathname into which the cached dependency should be
 * extracted.
 * @param {String} shasum - shasum (unique identifier) of the cached tarball.
 * @return {Observable} - observable sequence that will be completed once
 * the cached dependency has been fetched.
 */
export function extract (dest, shasum) {
  return Observable.create((observer) => {
    const handler = () => observer.complete()
    const errHandler = (err) => observer.error(err)

    const untar = tar.extract(dest, {strip: 1})
    this.read(shasum).on('error', errHandler)
      .pipe(gunzip()).on('error', errHandler)
      .pipe(untar).on('error', errHandler)
      .on('finish', handler)
  })
}
