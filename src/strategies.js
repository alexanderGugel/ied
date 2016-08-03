import {ArrayObservable} from 'rxjs/observable/ArrayObservable'
import {ScalarObservable} from 'rxjs/observable/ScalarObservable'
import {EmptyObservable} from 'rxjs/observable/EmptyObservable'
import {Observable} from 'rxjs/Observable'
import {_catch} from 'rxjs/operator/catch'
import {concatStatic} from 'rxjs/operator/concat'
import {map} from 'rxjs/operator/map'
import {mergeMap} from 'rxjs/operator/mergeMap'
import {mergeStatic} from 'rxjs/operator/merge'
import {reduce} from 'rxjs/operator/reduce'
import {ignoreElements} from 'rxjs/operator/ignoreElements'
import {retryWhen} from 'rxjs/operator/retryWhen'
import {concatMap} from 'rxjs/operator/concatMap'

import assert from 'assert'
import crypto from 'crypto'
import needle from 'needle'
import path from 'path'

import * as cache from './cache'
import * as config from './config'
import * as registry from './registry'
import * as util from './util'
import {normalizeBin} from './pkg_json'

import debuglog from './debuglog'

const log = debuglog('strategies')

export const localStrategy = {
	fetch: EmptyObservable.create,

	resolve (baseDir, pId, name) {
		const linkname = path.join(baseDir, pId, 'node_modules', name)
		const filename = path.join(linkname, 'package.json')

		const nodeModules$ = util.readlink(linkname)
			::map((link) => ({id: path.basename(path.dirname(link))}))

		const pkgJson$ = util.readFileJSON(filename)
			::map((pkgJson) => ({pkgJson}))

		return mergeStatic(nodeModules$, pkgJson$)
			::reduce((result, x) => ({...result, ...x}), {strategy: localStrategy})
	}
}

export const registryStrategy = {
	fetch (baseDir, {id, pkgJson}) {
		const {dist: {tarball, shasum}} = pkgJson
		const where = path.join(baseDir, id, 'package')
		const extracted = cache.extract(where, shasum)

		return extracted
			::_catch((err) => {
				if (err.code !== 'ENOENT') throw err
				return concatStatic(download(tarball, shasum), extracted)
			})
			::mergeMap(() => fixPermissions(where, normalizeBin(pkgJson)))
	},

	resolve (baseDir, pId, name, version) {
		const options = {...config.httpOptions, retries: config.retries}

		return registry.match(config.registry, name, version, options)
			::map((pkgJson) => ({
				pkgJson,
				id: pkgJson.dist.shasum,
				strategy: registryStrategy
			}))
	}
}

function checkShasum (shasum, expected, tarball) {
	assert.equal(
		shasum,
		expected,
		`shasum mismatch for ${tarball}: ${shasum} <-> ${expected}`
	)
}

function download (tarball, shasum) {
	// , type
	// log(`downloading ${tarball}, expecting ${expected}`)
	return Observable.create((observer) => {
		const hash = crypto.createHash('sha1')
		const response = needle.get(tarball, config.httpOptions)
		const cached = response.pipe(cache.write())

		const errorHandler = (error) => observer.error(error)
		const dataHandler = (chunk) => hash.update(chunk)
		const finishHandler = () => {
			const actualShasum = hash.digest('hex')
			log(`downloaded ${actualShasum} into ${cached.path}`)

			// only actually check shasum integrity for npm tarballs
			// TODO
			// const expectedShasum = ['range', 'version', 'tag'].indexOf(type) !== -1
			// 	? actualShasum
			// 	: expected

			observer.next({tmpPath: cached.path, shasum})
			observer.complete()
		}

		response.on('data', dataHandler)
		response.on('error', errorHandler)

		cached.on('error', errorHandler)
		cached.on('finish', finishHandler)
	})
	::mergeMap(({tmpPath, shasum: actualShasum}) => {
		// TODO shasum check
		// if (actualShasum) {
		// 	checkShasum(shasum, expected, tarball)
		// }

		const newPath = path.join(config.cacheDir, shasum)
		return util.rename(tmpPath, newPath)
	})
}

function fixPermissions (dir, bin) {
	const execMode = 0o777 & (~process.umask())
	const paths = []
	const names = Object.keys(bin)
	for (let i = 0; i < names.length; i++) {
		const name = names[i]
		paths.push(path.resolve(dir, bin[name]))
	}
	return ArrayObservable.create(paths)::mergeMap(
		(filepath) => util.chmod(filepath, execMode)
	)
}

// export function NotFoundError (baseDir, pId, name, version) {
// 	this.name = 'NotFoundError'
// 	this.path = path.join(baseDir, pId, 'node_modules', name)
// 	this.version = version
// 	this.message = `${this.path}@${this.version} not found`
// 	Error.captureStackTrace(this, this.constructor)
// }
