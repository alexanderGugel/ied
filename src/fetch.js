import assert from 'assert'
import crypto from 'crypto'
import needle from 'needle'
import path from 'path'
import {Observable} from 'rxjs/Observable'
import {_catch} from 'rxjs/operator/catch'
import {concatStatic} from 'rxjs/operator/concat'
import {ignoreElements} from 'rxjs/operator/ignoreElements'
import {mergeMap} from 'rxjs/operator/mergeMap'

import * as cache from './cache'
import * as config from './config'
import * as util from './util'
import {normalizeBin} from './pkg_json'

export const checkShasum = (shasum, expected, tarball) =>
	void assert.equal(shasum, expected,
		`shasum mismatch for ${tarball}: ${shasum} <-> ${expected}`)

const download = (tarball, expected, type) =>
	Observable.create(observer => {
		const shasum = crypto.createHash('sha1')
		const response = needle.get(tarball, config.httpOptions)
		const cached = response.pipe(cache.write())

		const errorHandler = error => observer.error(error)
		const dataHandler = chunk => shasum.update(chunk)
		const finishHandler = () => {
			const actualShasum = shasum.digest('hex')
			// only actually check shasum integrity for npm tarballs
			const expectedShasum = ['range', 'version', 'tag'].indexOf(type) !== -1 ?
				actualShasum : expected
			observer.next({tmpPath: cached.path, shasum: expectedShasum})
			observer.complete()
		}

		response.on('data', dataHandler)
		response.on('error', errorHandler)

		cached.on('error', errorHandler)
		cached.on('finish', finishHandler)
	})
	::mergeMap(({tmpPath, shasum}) => {
		if (expected) checkShasum(shasum, expected, tarball)

		const newPath = path.join(config.cacheDir, shasum)
		return util.rename(tmpPath, newPath)
	})

export default function fetch (nodeModules) {
	const {target, type, pkgJson: {name, bin, dist: {tarball, shasum}}} = this
	const packageDir = path.join(nodeModules, target, 'package')

	return util.stat(packageDir)
		::_catch(err => {
			if (err.code !== 'ENOENT') throw err
			return cache.extract(packageDir, shasum)
		})
		::_catch(err => {
			if (err.code !== 'ENOENT') throw err
			return concatStatic(
				download(tarball, shasum, type),
				cache.extract(packageDir, shasum),
				util.fixPermissions(packageDir, normalizeBin({name, bin}))
			)
		})
		::ignoreElements()
}
