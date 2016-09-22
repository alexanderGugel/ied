import fetch from './fetch'
import url from 'url'
import {_do} from 'rxjs/operator/do'
import {httpGet} from './util'
import {inherits} from 'util'
import {map} from 'rxjs/operator/map'
import {retry} from 'rxjs/operator/retry'
import {maxSatisfying} from 'semver'
import {publishReplay} from 'rxjs/operator/publishReplay'

/**
 * Number of times a failed request should be retried.
 * @type {number}
 */
export const RETRY_COUNT = 5

/**
 * Default CommonJS registry used for resolving dependencies.
 * @type {string}
 */
export const REGISTRY = 'https://registry.npmjs.org/'

/**
 * Register of pending and completed HTTP requests mapped to their respective
 * observable sequences. Used for ensuring that no duplicate requests to the
 * same URLs are being made.
 * @type {Object}
 */
export const requests = Object.create(null)

/**
 * Clears the internal cache used for pending and completed HTTP requests.
 */
export const reset = () => {
	const uris = Object.keys(requests)
	for (let i = 0; i < uris.length; i++) {
		delete requests[uris[i]]
	}
}

/**
 * Checks if the passed in depednency name is "scoped". Scoped npm modules, such
 * as @alexanderGugel/some-package, are "@"-prefixed ans usually "private (thus
 * require a bearer token in the corresponding HTTP request).
 * @param  {string} name Package name to be checked.
 * @return {boolean} if the package name is scoped.
 */
const isScoped = name =>
	name.charAt(0) === '@'

/**
 * Escapes the given package name, which can then be used as part of the package
 * root URL.
 * @param  {string} name Package name to be escaped.
 * @return {string} Escaped package name.
 */
export const escapeName = name => (
	isScoped(name)
		? `@${encodeURIComponent(name.substr(1))}`
		: encodeURIComponent(name)
)

/**
 * Fetches  the resource at the supplied URI. if a request to the same URI has
 * already been made, return the cached (pending) request.
 * @param  {string} uri URI to be requested.
 * @param  {Object} [options] HTTP Options.
 * @return {Observable} Cold cached observable representing the outstanding
 *     HTTP request.
 */
export const getJson = (uri, options = {}) => {
	const existingRequest = requests[uri]
	if (existingRequest) return existingRequest

	// if there is no pending / fulfilled request to this URI, dispatch a
	// new request.
	const newRequest = httpGet(uri, options)
		::publishReplay().refCount()
	requests[uri] = newRequest
	return newRequest
}

/**
 * The package root url is the base URL where a client can get top-level
 * information about a package and all of the versions known to the registry.
 * A valid “package root url” response MUST be returned when the client requests
 * {registry root url}/{package name}.
 * Source: http://wiki.commonjs.org/wiki/Packages/Registry#package_root_url
 * Ideally we would use the package version url, but npm's caching policy seems
 * a bit buggy in that regard.
 * @param  {string} registry CommonJS registry root URL.
 * @param  {string} name Package name to be resolved.
 * @return {string} The package root URL.
 */
export const getPackageRootUrl = (registry, name) =>
	url.resolve(registry, escapeName(name))


/**
 * Finds a matching version or tag given the registry response.
 * versions: An object hash of version identifiers to valid “package version
 * url” responses: either URL strings or package descriptor objects.
 * Source: http://wiki.commonjs.org/wiki/Packages/Registry#Package_Root_Object
 * @param  {string} name Package name to be matched.
 * @param  {string} versionOrTag SemVer version number or npm tag.
 * @return {function} A function to be used for processing subsequent registry
 *     responses and parsing out the matched [package version
 */
export const findVersion = (name, versionOrTag) => body => {
	const versionsKeys = Object.keys(body.versions)
	const versionKey = body['dist-tags'][versionOrTag]
		|| maxSatisfying(versionsKeys, versionOrTag)
	const version = versionKey && body.versions[versionKey]
	if (!version) {
		const available = versionsKeys.concat(Object.keys(body['dist-tags']))
		throw new NoMatchingVersionError(name, version, available)
	}
	return version
}

// thrown when the package exists, but no matching version is available.
inherits(NoMatchingVersionError, Error)
export function NoMatchingVersionError (name, version, available) {
	Error.captureStackTrace(this, this.constructor)
	this.name = 'NoMatchingVersionError'
	this.message = `no matching version for ${name}@${version}
available: ${available.join(',') || '[none]'}`
	this.extra = {name, version, available}
}

// thrown when the package itself (= name) does not exist.
inherits(NoMatchingNameError, Error)
export function NoMatchingNameError (name, version) {
	Error.captureStackTrace(this, this.constructor)
	this.name = 'NoMatchingNameError'
	this.message = `no matching name for ${name}@${version}`
	this.extra = {name, version}
}

// thrown when registry responded with an unexpected status code, such as a 500
// indicating an internal registry error.
inherits(StatusCodeError, Error)
export function StatusCodeError (name, version, statusCode, error) {
	Error.captureStackTrace(this, this.constructor)
	this.name = 'StatusCodeError'
	const message = `unexpected status code ${statusCode} for ${name}@${version}`
	this.message = error != null ? `${message}: ${error}` : message
	this.extra = {name, version, statusCode, error}
}

/**
 * Ensures that the registry responded with an accepted HTTP status code
 * (`200` in this case). This creates a function that — when applicable — throws
 * a corresponding error. The function arguments are used exclusively for
 * constructing the custom error messages.
 * @param  {string} name Package name to be used in potential error object.
 * @param  {string} version Package version to be used in potential error
 *     object.
 */
export const checkStatus = (name, version) => ({
	statusCode,
	body: {error}
}) => {
	switch (statusCode) {
		case 200: break
		case 404: throw new NoMatchingNameError(name, version)
		default: throw new StatusCodeError(name, version, statusCode, error)
	}
}

const extractBody = ({body}) => body

/**
 * Resolves a package defined via an ambiguous semantic version string to a
 * specific `package.json` file.
 * @param  {string} name Package name to be matched.
 * @param  {string} version Package version to be matched.
 * @param  {object} [options] HTTP and custom options.
 * @return {Observable} An observable sequence representing the asynchronously
 *     resolved `package.json` document representing the dependency.
 */
export const match = (name, version, {
	registry = REGISTRY,
	retryCount = RETRY_COUNT,
	...options
} = {}) =>
	getJson(getPackageRootUrl(registry, name), options)
		::retry(retryCount)
		::_do(checkStatus(name, version))
		::map(extractBody)
		::map(findVersion(name, version))

export const resolve = (nodeModules, parentTarget, name, version, options) =>
	match(name, version, options)::map(pkgJson => ({
		parentTarget,
		pkgJson,
		target: pkgJson.dist.shasum,
		name,
		fetch
	}))
