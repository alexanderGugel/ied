import * as config from './config'
import crypto from 'crypto'
import fs from 'fs'
import gunzip from 'gunzip-maybe'
import needle from 'needle'
import path from 'path'
import tar from 'tar-fs'
import uuid from 'node-uuid'
import {Observable} from 'rxjs/Observable'
import * as util from './util'

/**
 * initialize the cache.
 * @return {Observable} - an observable sequence that will be completed once
 * the base directory of the cache has been created.
 */
export function init () {
  return util.mkdirp(path.join(config.cacheDir, '.tmp'))
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

/**
 * download a tarball into the temporary directory of the cache.
 * @param  {String} tarball - tarball URL.
 * @return {Observable} - observable sequence of `tmpPath` and `shasum`.
 */
export function download (tarball) {
  return Observable.create((observer) => {
    const errorHandler = (error) => observer.error(error)
    const dataHandler = (chunk) => {
      shasum.update(chunk)
    }
    const finishHandler = () => {
      const hex = shasum.digest('hex')
      observer.next({ tmpPath: cached.path, shasum: hex })
      observer.complete()
    }

    const shasum = crypto.createHash('sha1')
    const response = needle.get(tarball, config.httpOptions)
    const cached = response.pipe(write())

    response.on('data', dataHandler)
    response.on('error', errorHandler)

    cached.on('error', errorHandler)
    cached.on('finish', finishHandler)
  })
}
