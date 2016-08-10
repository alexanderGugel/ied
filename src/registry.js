import url from 'url'
import {map} from 'rxjs/operator/map'
import {_do} from 'rxjs/operator/do'
import {publishReplay} from 'rxjs/operator/publishReplay'
import {httpGet} from './util'
import {maxSatisfying} from 'semver'
import {inherits} from 'util'
import {fetch} from './install'

// default registry to be used.
export const REGISTRY = 'https://registry.npmjs.org/'

// register of pending and completed HTTP requests mapped to their respective
// observable sequences.
export const requests = Object.create(null)

// clear the internal cache used for pending and completed HTTP requests.
export const reset = () => {
	const uris = Object.keys(requests)
	uris.forEach(uri => delete requests[uri])
}

// scoped npm modules, such as @alexanderGugel/some-package, are "@"-prefixed.
const isScoped = name =>
	name.charAt(0) === '@'

// escape the given package name, which can then be used as part of the package
// root URL.
const escapeName = name => (
	isScoped(name)
		? `@${encodeURIComponent(name.substr(1))}`
		: encodeURIComponent(name)
)

// HTTP GET the resource at the supplied URI. if a request to the same URI has
// already been made, return the cached (pending) request.
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

// The package root url is the base URL where a client can get top-level
// information about a package and all of the versions known to the registry.
// A valid “package root url” response MUST be returned when the client requests
// {registry root url}/{package name}.
// Ideally we would use the package version url, but npm's caching policy seems
// a bit buggy in that regard.
// Source: http://wiki.commonjs.org/wiki/Packages/Registry#package_root_url
export const getPackageRootUrl = (registry, name) =>
	url.resolve(registry, escapeName(name))

// find a matching version or tag given the registry response.
// versions: An object hash of version identifiers to valid “package version
// url” responses: either URL strings or package descriptor objects.
// Source: http://wiki.commonjs.org/wiki/Packages/Registry#Package_Root_Object
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

// ensure that the registry responded with an accepted HTTP status code (`200`).
export const checkStatus = (name, version) => ({statusCode, body: {error}}) => {
	switch (statusCode) {
		case 200: break
		case 404: throw new NoMatchingNameError(name, version)
		default: throw new StatusCodeError(name, version, statusCode, error)
	}
}

const extractBody = ({body}) => body

// resolve a package defined via an ambiguous semantic version string to a
// specific `package.json` file.
export const match = (name, version, {registry = REGISTRY, ...options} = {}) =>
	getJson(getPackageRootUrl(registry, name), options)
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
