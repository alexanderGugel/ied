import {Observable} from 'rxjs/Observable'
import {mergeMap} from 'rxjs/operator/mergeMap'
import {retryWhen} from 'rxjs/operator/retryWhen'
import gunzip from 'gunzip-maybe'
import tar from 'tar-fs'
import fs from 'fs'
import path from 'path'
import uuid from 'uuid'
import * as util from './util'
import * as config from './config'

/**
 * initialize the cache.
 * @return {Observable} - observable sequence that will be completed once the
 * base directory of the cache has been created.
 */
export function init () {
	return util.mkdirp(path.join(config.cacheDir, '.tmp'))
}

/**
 * get a random temporary filename.
 * @return {String} - temporary filename.
 */
export function getTmp () {
	const filename = path.join(config.cacheDir, '.tmp', uuid.v4())
	return filename
}

/**
 * open a write stream into a temporarily cached file for caching a new
 * package.
 * @return {WriteStream} - Write Stream
 */
export function write () {
	return fs.createWriteStream(getTmp())
}

/**
 * open a read stream to a cached dependency.
 * @param  {String} id - id (unique identifier) of the cached tarball.
 * @return {ReadStream} - Read Stream
 */
export function read (id) {
	const filename = path.join(config.cacheDir, id)
	return fs.createReadStream(filename)
}

/**
 * extract a dependency from the cache.
 * @param {String} dest - pathname into which the cached dependency should be
 * extracted.
 * @param {String} id - id (unique identifier) of the cached tarball.
 * @return {Observable} - observable sequence that will be completed once
 * the cached dependency has been fetched.
 */
export function extract (dest, id) {
	return Observable.create((observer) => {
		const tmpDest = getTmp()
		const untar = tar.extract(tmpDest, {strip: 1})

		const completeHandler = () => {
			observer.next(tmpDest)
			observer.complete()
		}
		const errorHandler = (err) => observer.error(err)

		this.read(id).on('error', errorHandler)
			.pipe(gunzip()).on('error', errorHandler)
			.pipe(untar).on('error', errorHandler)
			.on('finish', completeHandler)
	})
		::mergeMap((tmpDest) => util.rename(tmpDest, dest)
			::retryWhen((errors) => errors::mergeMap((error) => {
				if (error.code !== 'ENOENT') {
					throw error
				}
				return util.mkdirp(path.dirname(dest))
			}))
		)
}
