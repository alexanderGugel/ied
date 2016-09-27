import assert from 'assert'
import crypto from 'crypto'
import needle from 'needle'
import path from 'path'
import {Observable} from 'rxjs/Observable'
import {_catch} from 'rxjs/operator/catch'
import {_do} from 'rxjs/operator/do'
import {concatStatic} from 'rxjs/operator/concat'
import {ignoreElements} from 'rxjs/operator/ignoreElements'
import {mergeMap} from 'rxjs/operator/mergeMap'

import * as cache from './cache'
import * as config from './config'
import * as util from './util'
import {normalizeBin} from './pkg_json'

import debuglog from './debuglog'

const debug = debuglog('fetch')

export const checkShasum = (shasum, expected, tarball) => {
	assert.equal(shasum, expected,
		`shasum mismatch for ${tarball}: ${shasum} <-> ${expected}`)
}

export const download = (tarball) =>
	Observable.create(observer => {
		debug('downloading %s', tarball)
		const shasum = crypto.createHash('sha1')
		const response = needle.get(tarball, config.httpOptions)
		const cached = response.pipe(cache.write())

		const errorHandler = error => observer.error(error)
		const dataHandler = chunk => shasum.update(chunk)
		const finishHandler = () => {
			observer.next([shasum.digest('hex'), cached.path])
			observer.complete()
		}

		response
			.on('data', dataHandler)
			.on('error', errorHandler)

		cached
			.on('error', errorHandler)
			.on('finish', finishHandler)
	})

function verifyDownload (tarball, expected) {
	return this::_do(([shasum]) => {
		checkShasum(shasum, expected, tarball)
	})
}

function indexDownload () {
	return this::mergeMap(([shasum, tmpPath]) => {
		const newPath = path.join(config.cacheDir, shasum)
		return util.rename(tmpPath, newPath)
	})
}

export default function (nodeModules) {
	const {id, pkgJson: {name, bin, dist: {tarball, shasum}}} = this
	const packageDir = path.join(nodeModules, id, 'package')

	return util.stat(packageDir)
		::_catch(err => {
			if (err.code !== 'ENOENT') {
				throw err
			}
			return cache.extract(packageDir, shasum)
		})
		::_catch(err => {
			if (err.code !== 'ENOENT') {
				throw err
			}
			return concatStatic(
				download(tarball)
					::verifyDownload(tarball, shasum)
					::indexDownload(),
				cache.extract(packageDir, shasum),
				util.fixPermissions(packageDir, normalizeBin({name, bin}))
			)
		})
		::ignoreElements()
}
