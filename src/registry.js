import url from 'url'
import {map} from 'rxjs/operator/map'
import {_do} from 'rxjs/operator/do'
import {retry} from 'rxjs/operator/retry'
import {publishReplay} from 'rxjs/operator/publishReplay'
import {httpGet} from './util'
import * as config from './config'

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
	for (let uri of uris) {
		delete requests[uri]
	}
}

/**
 * ensure that the registry responded with an accepted HTTP status code
 * (`200`).
 * @param  {String} uri - URI used for retrieving the supplied response.
 * @param  {Number} resp - HTTP response object.
 * @throws {Error} if the status code does not indicate success.
 */
export function validateStatusCode (uri, resp) {
	const { statusCode, body: { error } } = resp
	if (statusCode !== 200) {
		throw new Error(`unexpected status code ${statusCode} from ${uri}: ${error}`)
	}
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
		? '@' + encodeURIComponent(name.substr(1))
		: encodeURIComponent(name)
	return escapedName
}

export function httpGetPackageVersion (name, version) {
	const escapedName = escapeName(name)
	const uri = url.resolve(config.registry, escapedName + '/' + version)
	return createRequest(uri)
}

export function createRequest (uri) {
	const existingRequest = requests[uri]
	if (existingRequest) {
		return existingRequest
	}
	const newRequest = httpGet(uri, config.httpOptions)::retry(5)
		::_do((response) => validateStatusCode(uri, response))
		::publishReplay().refCount()
	requests[uri] = newRequest
	return newRequest
}

/**
 * resolve a package defined via an ambiguous semantic version string to a
 * specific `package.json` file.
 * @param {String} name - package name.
 * @param {String} versionOrTag - semantic version string to be used as a
 * target.
 * @return {Observable} - observable sequence of the `package.json` file.
 */
export function match (name, versionOrTag) {
	return httpGetPackageVersion(name, versionOrTag)
		::map(({ body }) => body)
}
