import crypto from 'crypto'
import path from 'path'
import {ArrayObservable} from 'rxjs/observable/ArrayObservable'
import {Observable} from 'rxjs/Observable'
import {concatStatic} from 'rxjs/operator/concat'
import {_catch} from 'rxjs/operator/catch'
import {mergeMap} from 'rxjs/operator/mergeMap'
import {skip} from 'rxjs/operator/skip'
import needle from 'needle'
import assert from 'assert'

import * as cache from './cache'
import * as config from './config'
import * as util from './util'
import {normalizeBin} from './pkg_json'

export const checkShasum = (shasum, expected, tarball) =>
	void assert.equal(shasum, expected,
		`shasum mismatch for ${tarball}: ${shasum} <-> ${expected}`)

const download = (tarball, expected, type) =>
	Observable.create((observer) => {
		const shasum = crypto.createHash('sha1')
		const response = needle.get(tarball, config.httpOptions)
		const cached = response.pipe(cache.write())

		const errorHandler = (error) => observer.error(error)
		const dataHandler = (chunk) => shasum.update(chunk)
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
		if (expected) {
			checkShasum(shasum, expected, tarball)
		}

		const newPath = path.join(config.cacheDir, shasum)
		return util.rename(tmpPath, newPath)
	})

const fixPermissions = (target, bin) => {
	const execMode = 0o777 & (~process.umask())
	const paths = []
	const names = Object.keys(bin)
	for (let i = 0; i < names.length; i++) {
		const name = names[i]
		paths.push(path.resolve(target, bin[name]))
	}
	return ArrayObservable.create(paths)
		::mergeMap(filepath => util.chmod(filepath, execMode))
}

export default function fetch (nodeModules) {
	const {target, type, pkgJson: {name, bin, dist: {tarball, shasum}}} = this
	const where = path.join(nodeModules, target, 'package')

	return util.stat(where)::skip(1)::_catch(err => {
		if (err.code !== 'ENOENT') {
			throw err
		}
		const extracted = cache.extract(where, shasum)::_catch(err2 => {
			if (err2.code !== 'ENOENT') {
				throw err2
			}
			return concatStatic(
				download(tarball, shasum, type),
				cache.extract(where, shasum)
			)
		})
		return concatStatic(
			extracted,
			fixPermissions(where, normalizeBin({name, bin}))
		)
	})
}
