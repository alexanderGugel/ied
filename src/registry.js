import semver from 'semver'
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
 * ensures that the registry responded with an accepted HTTP status code
 * (`200`).
 * @param  {String} uri - URI used for retrieving the supplied response.
 * @param  {Number} options.statusCode - HTTP status code.
 * @param  {Object} options.body - JSON response body.
 * @param  {*} options.body.error - custom registry error.
 * @throws {Error} if the status code does not indicate success.
 */
export function validateStatusCode (uri, { statusCode, body: { error } }) {
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

/**
 * fetch the CommonJS package root JSON document for a specific npm package.
 * @param {String} name - package name.
 * @return {Object} - observable sequence of the JSON document that represents
 * the package root.
 */
export function httpGetPackageRoot (name) {
	const escapedName = escapeName(name)
	const uri = url.resolve(config.registry, escapedName)
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
 * find a package.json from the given set of available versions using the
 * supplied semver-compatible version string.
 * @param  {String} version - semver-compatible version.
 * @param  {Object} packageRoot - package root document as retrieved from the
 * registry.
 * @return {Object} - matching version.
 * @throws {SyntaxError} if `.versions` is missing.
 */
export function matchSemVer (version, packageRoot) {
	if (typeof packageRoot.versions !== 'object') {
		throw new SyntaxError('package root is missing plain object property "versions"')
	}
	const availableVersions = Object.keys(packageRoot.versions)
	const targetVersion = semver.maxSatisfying(availableVersions, version)
	return packageRoot.versions[targetVersion]
}

/**
 * find a package.json given a tag pointing to an arbitrary semver-compatible
 * version string.
 * @param  {String} tag - tag name of the requested dependency.
 * @param  {Object} packageRoot - package root document as retrieved from the
 * registry.
 * @return {Object} - matching version.
 * @throws {SyntaxError} if `dist-tags` (or `versions`) is missing.
 */
export function matchTag (tag, packageRoot) {
	if (typeof packageRoot['dist-tags'] !== 'object') {
		throw new SyntaxError('package root is missing plain object property "dist-tags"')
	}
	const version = packageRoot['dist-tags'][tag]
	if (!version) {
		return null
	}
	return matchSemVer(version, packageRoot)
}

/**
 * resolve a package defined via an ambiguous semantic version string to a
 * specific `package.json` file.
 * @param {String} name - package name.
 * @param {String} version - semantic version string to be used as a target.
 * @return {Object} - observable sequence of the `package.json` file.
 */
export function match (name, versionOrTag) {
	return httpGetPackageRoot(name)::map(({ body }) => {
		const result = semver.validRange(versionOrTag)
			? matchSemVer(versionOrTag, body)
			: matchTag(versionOrTag, body)

		if (!result) {
			throw new Error(`failed to match ${name}@${versionOrTag}`)
		}
		return result
	})
}
