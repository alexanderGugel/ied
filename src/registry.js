import semver from 'semver'
import url from 'url'
import {map} from 'rxjs/operator/map'
import {_do} from 'rxjs/operator/do'
import {retry} from 'rxjs/operator/retry'
import {publishReplay} from 'rxjs/operator/publishReplay'
import {httpGet} from './util'
import * as config from './config'

const requests = Object.create(null)

function validateStatusCode (uri, { statusCode, body: { error } }) {
  if (statusCode !== 200) {
    throw new Error(`unexpected status code ${statusCode} from ${uri}: ${error}`)
  }
}

function escapeName (name) {
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
  if (existingRequest) return existingRequest
  const newRequest = httpGet(uri, config.httpOptions)::retry(5)
    ::_do((response) => validateStatusCode(uri, response))
    ::publishReplay().refCount()
  requests[uri] = newRequest
  return newRequest
}

function matchSemVer (version, packageRoot) {
  if (typeof packageRoot.versions !== 'object') {
    throw new SyntaxError('package root is missing plain object property "versions"')
  }
  const availableVersions = Object.keys(packageRoot.versions)
  const targetVersion = semver.maxSatisfying(availableVersions, version)
  return packageRoot.versions[targetVersion]
}

function matchTag (tag, packageRoot) {
  if (typeof packageRoot['dist-tags'] !== 'object') {
    throw new SyntaxError('package root is missing plain object property "dist-tags"')
  }
  return packageRoot.versions[packageRoot['dist-tags'][tag]]
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

    if (!result) throw new Error(`failed to match ${name}@${versionOrTag}`)
    return result
  })
}
