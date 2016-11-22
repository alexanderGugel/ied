import {Observable} from 'rxjs/Observable'
import fs from 'fs'
import _mkdirp from 'mkdirp'
import _forceSymlink from 'force-symlink'
import needle from 'needle'
import {map} from 'rxjs/operator/map'
import {mergeMap} from 'rxjs/operator/mergeMap'
import * as config from './config'
import getRegistryAuthToken from 'registry-auth-token'
import semver from 'semver'

/**
 * given an arbitrary asynchronous function that accepts a callback function,
 * wrap the outer asynchronous function into an observable sequence factory.
 * invoking the returned generated function is going to return a new **cold**
 * observable sequence.
 * @param  {Function} fn - function to be wrapped.
 * @param  {thisArg} [thisArg] - optional context.
 * @return {Function} - cold observable sequence factory.
 */
export function createObservableFactory (fn, thisArg) {
	return (...args) =>
		Observable.create((observer) => {
			fn.apply(thisArg, [...args, (error, ...results) => {
				if (error) {
					observer.error(error)
				} else {
					results.forEach(result => observer.next(result))
					observer.complete()
				}
			}])
		})
}

/**
 * send a GET request to the given HTTP endpoint by passing the supplied
 * arguments to [`needle`](https://www.npmjs.com/package/needle).
 * @return {Observable} - observable sequence of a single response object.
 */
export function httpGet (...args) {
	return Observable.create((observer) => {
		needle.get(...args, (error, response) => {
			if (error) observer.error(error)
			else {
				observer.next(response)
				observer.complete()
			}
		})
	})
}

/**
 * GETs JSON documents from an HTTP endpoint.
 * @param  {String} url - endpoint to which the GET request should be made
 * @return {Object} An observable sequence of the fetched JSON document.
 */
export function httpGetJSON (url) {
	return Observable.create((observer) => {
		needle.get(url, config.httpOptions, (error, response) => {
			if (error) observer.error(error)
			else {
				observer.next(response.body)
				observer.complete()
			}
		})
	})
}

/** @type {Function} Observable wrapper function around `fs.readFile`. */
export const readFile = createObservableFactory(fs.readFile, fs)

/** @type {Function} Observable wrapper function around `fs.writeFile`. */
export const writeFile = createObservableFactory(fs.writeFile, fs)

/** @type {Function} Observable wrapper function around `fs.stat`. */
export const stat = createObservableFactory(fs.stat, fs)

/** @type {Function} Observable wrapper function around `fs.rename`. */
export const rename = createObservableFactory(fs.rename, fs)

/** @type {Function} Observable wrapper function around `fs.readlink`. */
export const readlink = createObservableFactory(fs.readlink, fs)

/** @type {Function} Observable wrapper function around `fs.readdir`. */
export const readdir = createObservableFactory(fs.readdir, fs)

/** @type {Function} Observable wrapper function around `fs.chmod`. */
export const chmod = createObservableFactory(fs.chmod, fs)

/** @type {Function} Observable wrapper function around `fs.unlink`. */
export const unlink = createObservableFactory(fs.unlink, fs)

/** @type {Function} Observable wrapper function around
[`force-symlink`](https://www.npmjs.org/package/force-symlink). */
export const forceSymlink = createObservableFactory(_forceSymlink)

/** @type {Function} Observable wrapper function around
[`mkdirp`](https://www.npmjs.com/package/mkdirp). */
export const mkdirp = createObservableFactory(_mkdirp)

/**
 * equivalent to `Map#entries` for observables, but operates on objects.
 * @return {Observable} - observable sequence of pairs.
 */
export function entries () {
	return this::mergeMap((object) => {
		const results = []
		const keys = Object.keys(object)
		for (const key of keys) {
			results.push([key, object[key]])
		}
		return results
	})
}

/**
 * read a UTF8 encoded JSON file from disk.
 * @param  {String} file - filename to be used.
 * @return {Observable} - observable sequence of a single object representing
 * the read JSON file.
 */
export function readFileJSON (file) {
	return readFile(file, 'utf8')::map(JSON.parse)
}

/**
 * set the terminal title using the required ANSI escape codes.
 * @param {String} title - title to be set.
 */
export function setTitle (title) {
	process.stdout.write(
		`${String.fromCharCode(27)}]0;${title}${String.fromCharCode(7)}`
	)
}

/**
 * get authorization headers if the given url is an npm registry url
 * and authorization tokens are known for it
 * @param {String} url - URL to return authorization headers for
 * @return {Object} - object containing the authorization headers
 */
export function authHeadersForUrl (url) {
	const token = getRegistryAuthToken(url, {recursive: true})
	return token ? {authorization: `Bearer ${token}`} : {}
}

/**
 * given a package info response from the npm registry,
 * find the latest version that satisfies the given range/tag
 * @param {Object} pkg - package info response from NPM registry
 * @param {String} requested - requested version range or tag
 * @return {String} latest version that satisfies given range/tag
 */
export function latestSatisfyingVersion (pkg, requested) {
	const tags = pkg['dist-tags'] || {}
	if (!semver.validRange(requested)) {
		return tags[requested]
	}

	const versions = Object.keys(pkg.versions).sort(semver.rcompare)
	const latest = tags.latest || versions[0]
	if (requested === '*') {
		return latest
	}

	for (const version of versions) {
		if (semver.satisfies(version, requested)) {
			return version
		}
	}

	return undefined
}
