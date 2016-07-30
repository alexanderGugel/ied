import url from 'url'
import {map} from 'rxjs/operator/map'
import {_do} from 'rxjs/operator/do'
import {retry} from 'rxjs/operator/retry'
import {publishReplay} from 'rxjs/operator/publishReplay'
import {httpGet} from './util'
import assert from 'assert'

/**
 * default number of retries to attempt before failing to resolve to a package
 * @type {Number}
 */
export const DEFAULT_RETRIES = 5

/**
 * register of pending and completed HTTP requests mapped to their respective
 * observable sequences.
 * @type {Object}
 */
export const requests = Object.create(null)

/**
 * clear the internal cache used for pending and completed HTTP requests.
 */
export function reset () {
	const uris = Object.keys(requests)
	for (const uri of uris) {
		delete requests[uri]
	}
}

/**
 * ensure that the registry responded with an accepted HTTP status code
 * (`200`).
 * @param  {String} uri - URI used for retrieving the supplied response.
 * @param  {Number} resp - HTTP response object.
 * @throws {assert.AssertionError} if the status code is not 200.
 */
export function checkStatus (uri, resp) {
	const {statusCode, body: {error}} = resp
	assert.equal(statusCode, 200, `error status code ${uri}: ${error}`)
}

/**
 * escape the given package name, which can then be used as part of the package
 * root URL.
 * @param  {String} name - package name.
 * @return {String} - escaped package name.
 */
export function escapeName (name) {
	const isScoped = name.charAt(0) === '@'
	const escapedName = isScoped
		? `@${encodeURIComponent(name.substr(1))}`
		: encodeURIComponent(name)
	return escapedName
}

/**
 * HTTP GET the resource at the supplied URI. if a request to the same URI has
 * already been made, return the cached (pending) request.
 * @param  {String} uri - endpoint to fetch data from.
 * @param  {Object} [options = {}] - optional HTTP and `retries` options.
 * @return {Observable} - observable sequence of pending / completed request.
 */
export function fetch (uri, options = {}) {
	const {retries = DEFAULT_RETRIES, ...needleOptions} = options
	const existingRequest = requests[uri]

	if (existingRequest) {
		return existingRequest
	}
	const newRequest = httpGet(uri, needleOptions)
		::_do((resp) => checkStatus(uri, resp))
		::retry(retries)::publishReplay().refCount()
	requests[uri] = newRequest
	return newRequest
}

/**
 * resolve a package defined via an ambiguous semantic version string to a
 * specific `package.json` file.
 * @param {String} registry - registry root URL.
 * @param {String} name - package name.
 * @param {String} version - semantic version string or tag name.
 * @param {Object} options - HTTP request options.
 * @return {Observable} - observable sequence of the `package.json` file.
 */
export function match (registry, name, version, options = {}) {
	const escapedName = escapeName(name)
	const uri = url.resolve(registry, `${escapedName}/${version}`)
	return fetch(uri, options)::map(({body}) => body)
}
