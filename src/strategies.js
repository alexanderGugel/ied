import {EmptyObservable} from 'rxjs/observable/EmptyObservable'
import {Observable} from 'rxjs/Observable'
import {_catch} from 'rxjs/operator/catch'
import {concatStatic} from 'rxjs/operator/concat'
import {map} from 'rxjs/operator/map'
import {mergeMap} from 'rxjs/operator/mergeMap'
import {mergeStatic} from 'rxjs/operator/merge'
import {reduce} from 'rxjs/operator/reduce'
import {_do} from 'rxjs/operator/do'

import crypto from 'crypto'
import needle from 'needle'
import path from 'path'

import * as cache from './cache'
import * as config from './config'
import * as registry from './registry'
import * as util from './util'
import debuglog from './debuglog'

export const localStrategy = {
	fetch: EmptyObservable.create,

	resolve (baseDir, pId, name) {
		const linkname = path.join(baseDir, pId, 'node_modules', name)
		const filename = path.join(linkname, 'package.json')

		const nodeModules$ = util.readlink(linkname)
			::map((link) => ({id: path.basename(path.dirname(link))}))

		const pkgJson$ = util.readFileJSON(filename)
			::map((pkgJson) => ({pkgJson}))

		return mergeStatic(nodeModules$, pkgJson$)::reduce(
			(result, x) => ({...result, ...x}),
			{strategy: localStrategy}
		)
	}
}

export const registryStrategy = {
	log: debuglog('registryStrategy'),

	download (tarball, shasum) {
		registryStrategy.log('SCHEDULE download', tarball, shasum)
		return Observable.create((observer) => {
			const hash = crypto.createHash('sha1')
			const response = needle.get(tarball, config.httpOptions)

			// TODO Perf Write into final package directory
			const cached = response.pipe(cache.write())

			const errorHandler = (error) => observer.error(error)
			const dataHandler = (chunk) => hash.update(chunk)
			const finishHandler = () => {
				observer.next({tmpPath: cached.path, shasum: hash.digest('hex')})
				observer.complete()
			}

			response.on('data', dataHandler)
			response.on('error', errorHandler)
			cached.on('error', errorHandler)
			cached.on('finish', finishHandler)
		})
		::mergeMap(({tmpPath}) => {
			const newPath = path.join(config.cacheDir, shasum)
			registryStrategy.log('DONE     download', tarball, shasum)
			return util.rename(tmpPath, newPath)
		})
	},

	fetch (baseDir, {id, pkgJson}) {
		const {dist: {tarball, shasum}} = pkgJson
		const where = path.join(baseDir, id, 'package')
		const extracted = cache.extract(where, shasum)

		return extracted
			::_catch((err) => {
				if (err.code !== 'ENOENT') throw err
				return concatStatic(
					registryStrategy.download(tarball, shasum),
					extracted
				)
			})
	},

	resolve (baseDir, pId, name, version) {
		registryStrategy.log('SCHEDULE resolve', baseDir, pId, name, version)
		const options = {...config.httpOptions, retries: config.retries}
		return registry.match(config.registry, name, version, options)
			::map((pkgJson) => ({
				pkgJson,
				id: pkgJson.dist.shasum,
				strategy: registryStrategy
			}))
			::_do(() => {
				registryStrategy.log('DONE     resolve', baseDir, pId, name, version)
			})
	}
}

// ::mergeMap(() => fixPermissions(where, normalizeBin(pkgJson)))

// function fixPermissions (dir, bin) {
// 	const execMode = 0o777 & (~process.umask())
// 	const paths = []
// 	const names = Object.keys(bin)
// 	for (let i = 0; i < names.length; i++) {
// 		const name = names[i]
// 		paths.push(path.resolve(dir, bin[name]))
// 	}
// 	return ArrayObservable.create(paths)::mergeMap(
// 		(filepath) => util.chmod(filepath, execMode)
// 	)
// }
