import semver from 'semver'
import url from 'url'
import {map} from 'rxjs/operator/map'
import {_do} from 'rxjs/operator/do'
import {retry} from 'rxjs/operator/retry'
import {publishReplay} from 'rxjs/operator/publishReplay'
import {httpGetJSON} from './util'
import * as config from './config'
import * as imCache from './im-cache'

/**
 * class used for throwing an error when the required version target is not
 * available.
 * @extends Error
 */
export class VersionError extends Error {
  /**
   * create instance.
   * @param {String} name - name of the package.
   * @param {String} version - unavailable version number.
   * @param {Array.<String>} - array of available version numbers.
   * @param {Array.<String>} options.available - an array of available versions
   */
  constructor (name, version, available) {
    super(`no satisying version of ${name} in ${available.join(', ')} for ${version}`)
    this.name = 'VersionError'
    this.pkgName = name
    this.version = version
    this.available = available
  }

  /**
   * name of the error (not the package name).
   *
   * @name VersionError#name
   * @type String
   * @default "VersionError"
   * @readonly
   */

  /**
   * package name.
   *
   * @name VersionError#pkgName
   * @type String
   * @readonly
   */
  
  /**
   * target version that could not be found.
   *
   * @name VersionError#version
   * @type String
   * @readonly
   */
  
  /**
   * all available version numbers of the supplied package.
   *
   * @name available
   * @type Array.<String>
   * @readonly
   */
}

export class PackageRootValidationError extends SyntaxError {
  /**
   * create instance.
   * @param  {String} url - url of the package root.
   * @param  {Object} body - body of the invalid package root.
   */
  constructor (url, body) {
    super(`invalid package root at ${url}`)
    this.name = 'PackageRootValidationError'
    this.url = url
    this.body = body
  }
  
  /**
   * name of the error.
   *
   * @name VersionError#name
   * @type String
   * @default "PackageRootValidationError"
   * @readonly
   */

  /**
   * url of the package root.
   * @type String
   * @readonly
   */
  
  /**
   * body of the invalid package root.
   * @type Object
   * @readonly
   */
}

/**
 * fetch the CommonJS package root JSON document for a specific npm package.
 * @param {String} name - package name.
 * @return {Object} - observable sequence of the JSON document that represents
 * the package root.
 */
export function httpGetPackageRoot (name) {
  const uri = url.resolve(config.registry, name)
  const cached = imCache.get(uri)
  if (cached) return cached
  const result = httpGetJSON(uri)
    ::validatePackageRoot(uri)
    ::publishReplay().refCount()
  return imCache.set(uri, result)
}

export function validatePackageRoot (url) {
  return this::_do((body) => {
    if (!body) throw new PackageRootValidationError(url, body)
    if (body.error) throw new Error(body.error)
    if (typeof body.versions !== 'object') throw new PackageRootValidationError(url, body)
  })
}

/**
 * resolve a package defined via an ambiguous semantic version string to a
 * specific `package.json` file.
 * @param {String} name - package name.
 * @param {String} version - semantic version string to be used as a target.
 * @return {Object} - observable sequence of the `package.json` file.
 */
export function resolve (name, version) {
  return httpGetPackageRoot(name)::map((packageRoot) => {
    const available = Object.keys(packageRoot.versions)
    const targetVersion = semver.maxSatisfying(available, version)
    const target = packageRoot.versions[targetVersion]
    if (!target) throw new VersionError(name, version, available)
    return target
  })
}
