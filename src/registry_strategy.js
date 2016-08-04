import {Observable} from 'rxjs/Observable'
import {_catch} from 'rxjs/operator/catch'
import {_do} from 'rxjs/operator/do'
import {_finally} from 'rxjs/operator/finally'
import {concatStatic} from 'rxjs/operator/concat'
import {map} from 'rxjs/operator/map'
import {mergeMap} from 'rxjs/operator/mergeMap'
import {publishReplay} from 'rxjs/operator/publishReplay'

import crypto from 'crypto'
import needle from 'needle'
import path from 'path'
import url from 'url'

import * as cache from './cache'
import * as config from './config'
import * as util from './util'

/**
 * register of pending and completed HTTP requests mapped to their respective
 * observable sequences.
 * @type {Object}
 */
const requests = Object.create(null)

/**
 * clear the internal cache used for pending anrd completed HTTP requests.
 */
export const reset = () =>
	Object.keys(requests)
		.forEach(uri => delete requests[uri])

/**
 * ensure that the registry responded with an accepted HTTP status code
 * (e.g. `200`).
 */
const checkStatus = (uri, expected) =>
	({statusCode: actual, body: {error}}) => {
		if (actual !== expected) {
			throw new Error(`unexpected status code ${actual} !== ${expected}: \
${error || '[no error message]'}`)
		}
	}

/**
 * check if the passed in name references a scoped module. scoped modules are
 * prefixed with "@".
 * @param  {string} name - package name.
 * @return {Boolean} - boolean value indicating whether or not the passed in
 *     package name is scoped.
 */
const isScoped = (name) =>
	name.charAt(0) === '@'

/**
 * escape the given package name, which can then be used as part of the package
 * root URL.
 * @param  {string} name - package name.
 * @return {string} - escaped package name.
 */
const escapeName = (name) => (
	isScoped(name)
		? `@${encodeURIComponent(name.substr(1))}`
		: encodeURIComponent(name)
)

/**
 * cache the given request.
 * @param  {string} uri - requested URI.
 * @param  {Observable} req - observable request.
 */
const setReq = (uri, req) => {
	requests[uri] = req
	return req
}

/**
 * get a cached request.
 * @param  {string} uri - requested URI.
 * @return {Observable|undefined} - cached observable request.
 */
const getReq = (uri) =>
	requests[uri]

/**
 * HTTP GET the resource at the supplied URI. if a request to the same URI has
 * already been made, return the cached (pending) request.
 * @param  {string} uri - endpoint to fetch data from.
 * @param  {Object} [options = {}] - optional HTTP options.
 * @return {Observable} - observable sequence of pending / completed request.
 */
const req = (uri, options = {}) =>
	getReq(uri) ||
	setReq(uri, util.httpGet(uri, options)
		::_do(checkStatus(uri, 200))
		::publishReplay().refCount())

const getUri = (registry, name, version) =>
	url.resolve(registry, `${escapeName(name)}/${version}`)

const extractBody = ({body}) => body

/**
 * convert a package defined via an ambiguous semantic version string to a
 * specific `package.json` file.
 * @param {string} name - package name.
 * @param {string} version - semantic version string or tag name.
 * @param {Object} options - additional HTTP request options.
 * @return {Observable} - observable sequence of the `package.json` file.
 */
const match = (name, version, {registry = config.registry, ...options} = {}) =>
	req(getUri(registry, name, version), options)::map(extractBody)

const download = tarball =>
	Observable.create((observer) => {
		const hash = crypto.createHash('sha1')
		const response = needle.get(tarball, config.httpOptions)

		const cached = response.pipe(cache.write())

		const errorHandler = (error) => observer.error(error)
		const dataHandler = (chunk) => hash.update(chunk)
		const finishHandler = () => {
			observer.next({shasum: hash.digest('hex')})
			observer.complete()
		}

		response.on('data', dataHandler)
		response.on('error', errorHandler)
		cached.on('error', errorHandler)
		cached.on('finish', finishHandler)
	})
	::mergeMap(({tmpPath, shasum}) =>
		util.rename(tmpPath, path.join(config.cacheDir, shasum))
	)

const fetch = (dir, id, pkgJson) => {
	const {dist: {tarball, shasum}} = pkgJson
	const pkgDir = path.join(dir, id, 'pkg')

	const extracted = cache.extract(pkgDir, shasum)

	return extracted
		::_catch(err => {
			if (err.code !== 'ENOENT') throw err
			return concatStatic(download(tarball, shasum), extracted)
		})
}

/**
 * find a matching `pkgJson` and `id` for the given dependency.
 * @param  {string} dir - base directory (ignored).
 * @param  {string} pId - parent id.
 * @param  {string} name - name of the dependency that should be resolved.
 * @param  {string} version - version of the dependency that should be resolved.
 *     this should either be a semantic versions string or a tag name.
 * @param  {Object = {}} options - optional HTTP options used for finding a
 *     matching the `package.json` via the configured Common JS registry.
 * @return {Observable} - observable sequence of a single resolved dependency.
 */
export default (dir, pId) => (name, version, options = {}) => {
	console.log('registry: resolve', name)

	return match(name, version, {...config.httpOptions, ...options})
		::map((pkgJson) => ({pkgJson, id: pkgJson.dist.shasum, fetch}))
		::_finally(() => console.log('fin: registry: resolve', name))
}
