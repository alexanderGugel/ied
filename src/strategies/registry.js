import semver from 'semver'
import url from 'url'
import {map} from 'rxjs/operator/map'
import {_do} from 'rxjs/operator/do'
import {retry} from 'rxjs/operator/retry'
import {publishReplay} from 'rxjs/operator/publishReplay'
import {concat} from 'rxjs/operator/concat'
import {mergeMap} from 'rxjs/operator/mergeMap'
import path from 'path'

import * as util from '../util'
import * as config from '../config'
import * as fsCache from '../fs_cache'
import {PackageRootError, VersionError, CorruptedPackageError} from '../errors'

/**
 * internal cache used for (pending) HTTP requests.
 * @type {Object}
 */
export const cache = {}

/**
 * Validate the given body.
 * @param  {String} url  - url from which the document has been retrieved.
 * @param  {Object} body - package root as JSON object.
 * @throws {PackageRootError}
 * @throws {Error}
 */
export function validatePackageRoot (uri, body) {
  if (!body || body.error || typeof body.versions !== 'object') {
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
  const cached = cache[uri]
  if (cached) return cached
  const result = util.httpGetJSON(uri)
    ::retry(5)
    ::_do((body) => validatePackageRoot(uri, body))
    ::publishReplay().refCount()
  cache[uri] = result
  return result
}

/**
 * resolve a package defined via an ambiguous semantic version string to a
 * specific `package.json` file.
 * @param {String} name - package name.
 * @param {String} version - semantic version string to be used as a target.
 * @return {Object} - observable sequence of the `package.json` file.
 */
export function match (name, version) {
  return httpGetPackageRoot(name)::map((packageRoot) => {
    const available = Object.keys(packageRoot.versions)
    const targetVersion = semver.maxSatisfying(available, version)
    const target = packageRoot.versions[targetVersion]
    if (!target) throw new VersionError(name, version, available)
    return target
  })
}

/**
 * obtain a dependency's `package.json` file using the pre-configured registry.
 * @param  {String} parentTarget - absolute parent's node_modules path.
 * @param  {String} name - name of the dependency that should be looked up in
 * the registry.
 * @param  {String} version - SemVer compatible version string.
 * @param  {String} baseDir - project-level `node_modules` base directory.
 * @return {Observable} - observable sequence of `package.json` objects.
 */
export function resolve (parentTarget, name, version, baseDir) {
  const _path = path.join(parentTarget, 'node_modules', name)
  return match(name, version)
    ::map((pkgJSON) => {
      const target = path.join(baseDir, 'node_modules', pkgJSON.dist.shasum)
      return { parentTarget, pkgJSON, target, path: _path, fetch }
    })
}

/**
 * fetch the dependency from the resolved package endpoint. verify integrity
 * of package through shasum supplied by the registry.
 * @return {Observable} - observable sequence that will be completed once the
 * fetch is successful.
 */
export function fetch () {
  const {target, pkgJSON: {name, bin, dist: { shasum: expectedShasum, tarball }}} = this
  const o = fsCache.extract(this.target, expectedShasum)
  return o::util.catchByCode({
    ENOENT: () => fsCache.download(tarball)
      ::mergeMap(({ tmpPath, shasum: actualShasum }) => {
        if (expectedShasum !== actualShasum) {
          throw new CorruptedPackageError(tarball, expectedShasum, actualShasum)
        }
        const newPath = path.join(config.cacheDir, actualShasum)
        return util.rename(tmpPath, newPath)
      })
      ::concat(o)
  })::concat(util.fixPermissions(target, util.normalizeBin({ name, bin })))
}
