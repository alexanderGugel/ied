import {Observable} from 'rxjs/Observable'
import fs from 'fs'
import _mkdirp from 'mkdirp'
import _forceSymlink from 'force-symlink'
import needle from 'needle'
import {map} from 'rxjs/operator/map'
import {mergeMap} from 'rxjs/operator/mergeMap'
import * as config from './config'

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
	return Observable.create(observer => {
		needle.get(...args, (error, response) => {
			if (error) observer.error(error)
			else {
				observer.next(response)
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
