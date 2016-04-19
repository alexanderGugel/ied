import semver from 'semver'
import url from 'url'
import {map} from 'rxjs/operator/map'
import {_do} from 'rxjs/operator/do'
import {retry} from 'rxjs/operator/retry'
import {publishReplay} from 'rxjs/operator/publishReplay'
import {httpGetJSON} from './util'
import * as config from './config'
import * as imCache from './im_cache'
import {PackageRootError} from './errors'

/**
 * Validate the given body.
 * @param  {String} url  - url from which the document has been retrieved.
 * @param  {Object} body - package root as JSON object.
 * @throws {PackageRootError}
 * @throws {Error}
 */
export function validatePackageRoot (uri, body) {
  if (!body || body.error) {
    throw new PackageRootError(uri, body)
  }
}

/**
 * fetch the CommonJS package root JSON document for a specific npm package.
 * @param {String} name - package name.
 * @return {Object} - observable sequence of the JSON document that represents
 * the package root.
 */
export function httpGetPackageRoot (name) {
  const isScoped = name.charAt(0) === '@'
  const escapedName = isScoped
    ? '@' + encodeURIComponent(name.substr(1))
    : encodeURIComponent(name)

  const uri = url.resolve(config.registry, escapedName)
  const cached = imCache.get(uri)
  if (cached) return cached
  const result = httpGetJSON(uri)
    ::retry(5)
    ::_do((body) => validatePackageRoot(uri, body))
    ::publishReplay().refCount()
  return imCache.set(uri, result)
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
  return httpGetPackageRoot(name)::map((packageRoot) => {
    const result = semver.validRange(versionOrTag)
      ? matchSemVer(versionOrTag, packageRoot)
      : matchTag(versionOrTag, packageRoot)

    if (!result) {
      throw new Error(`failed to match ${name}@${versionOrTag}`)
    }
    return result
  })
}
