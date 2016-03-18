import { Observable } from 'rxjs/Observable'
import gunzip from 'gunzip-maybe'
import tar from 'tar-fs'
import fs from 'fs'
import path from 'path'
import uuid from 'node-uuid'
import mkdirp from 'mkdirp'

import {cacheDir} from './config'

/**
 * Opens a write stream into a temporarily cached file for caching a new
 * dependency.
 *
 * @return {WriteStream}    Write Stream
 */
export function write () {
  return fs.WriteStream(path.join(cacheDir, '.tmp', uuid()))
}

/**
 * Opens a read stream to a cached dependency.
 *
 * @param  {String} shasum  Shasum (unique identifier) of the cached tarball.
 * @return {ReadStream}     Read Stream
 */
export function read (shasum) {
  return fs.ReadStream(path.join(cacheDir, shasum))
}

/**
 * Fetches a dependency from the cache.
 * 
 * @param  {String}   dest    The location into which the cached dependency
 *                            should be extracted.
 * @param  {String}   shasum  Shasum (unique identifier) of the cached tarball.
 * @return {Observable}       Observable
 */
export function fetch (dest, shasum) {
  return Observable.create((observer) => {
    const finHandler = (err) => observer.complete()
    const errHandler = (err) => observer.error(err)

    const untar = tar.extract(dest, { strip: 1 })
    read(shasum).on('error', errHandler)
      .pipe(gunzip()).on('error', errHandler)
      .pipe(untar).on('error', errHandler)
      .on('finish', finHandler)
  })
}
