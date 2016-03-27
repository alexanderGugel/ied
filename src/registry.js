import semver from 'semver'
import url from 'url'
import {map} from 'rxjs/operator/map'
import {publishReplay} from 'rxjs/operator/publishReplay'
import {httpGetJSON} from './util'
import config from './config'

/**
 * class used for throwing an error when the required version target is not
 * available.
 * @extends Error
 */
export class VersionError extends Error {
  /**
   * create instance.
   * @param {String} options.name - name of the package.
   * @param {String} options.version - unavailable version number.
   * @param {Array.<String>} options.available - an array of available versions
   */
  constructor ({ name, version, available }) {
    super(`no satisying version of ${name} in ${available.join(', ')} for ${version}`)
    this.name = 'VersionError'
    this.pkgName = name
    this.version = version
    this.available = available
  }

  /**
   * name of the error (not the package name),
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

/**
 * internal cache used for package root urls.
 * @type {Object}
 */
export const cache = Object.create(null)

/**
 * fetch the CommonJS package root JSON document for a specific npm package.
 * @param {String} name - package name.
 * @return {Object} - observable sequence of the JSON document that represents
 * the package root.
 */
export function httpGetPackageRoot (name) {
  const uri = url.resolve(config.registry, name)
  cache[name] = cache[name] || httpGetJSON(uri)::publishReplay().refCount()
  return cache[name]
}

/**
 * resolve a package defined via an ambiguous semantic version string to a
 * specific `package.json` file.
 * @param {String} name - package name.
 * @param {String} version - semantic version string to be used as a target.
 * @return {Object} - observable sequence of the `package.json` file.
 */
export function resolve (name, version) {
  return httpGetPackageRoot(name, config.registry)::map((packageRoot) => {
    const available = Object.keys(packageRoot.versions)
    const targetVersion = semver.maxSatisfying(available, version)
    const target = packageRoot.versions[targetVersion]
    if (!target) {
      throw new VersionError({name, version, available})
    }
    return target
  })
}
