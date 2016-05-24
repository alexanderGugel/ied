import crypto from 'crypto'
import path from 'path'
import {ArrayObservable} from 'rxjs/observable/ArrayObservable'
import {EmptyObservable} from 'rxjs/observable/EmptyObservable'
import {Observable} from 'rxjs/Observable'
import {_finally} from 'rxjs/operator/finally'
import {concatStatic} from 'rxjs/operator/concat'
import {distinctKey} from 'rxjs/operator/distinctKey'
import {expand} from 'rxjs/operator/expand'
import {filter} from 'rxjs/operator/filter'
import {map} from 'rxjs/operator/map'
import {_catch} from 'rxjs/operator/catch'
import {mergeMap} from 'rxjs/operator/mergeMap'
import {skip} from 'rxjs/operator/skip'
import needle from 'needle'

import * as cache from './cache'
import * as config from './config'
import * as registry from './registry'
import * as util from './util'
import * as progress from './progress'
import {normalizeBin, parseDependencies} from './pkg_json'

import debuglog from './debuglog'

const log = debuglog('install')

/**
 * properties of project-level `package.json` files that will be checked for
 * dependencies.
 * @type {Array.<String>}
 * @readonly
 */
export const ENTRY_DEPENDENCY_FIELDS = [
	'dependencies',
	'devDependencies',
	'optionalDependencies'
]

/**
 * properties of `package.json` of sub-dependencies that will be checked for
 * dependences.
 * @type {Array.<String>}
 * @readonly
 */
export const DEPENDENCY_FIELDS = [
	'dependencies',
	'optionalDependencies'
]

/**
 * Local dependency (already installed for project).
 * @type {Symbol}
 */
const LOCAL = Symbol('LOCAL')

/**
 * Registry dependency (available from registry).
 * @type {Symbol}
 */
const REGISTRY = Symbol('REGISTRY')

/**
 * resolve a dependency's `package.json` file from the local file system.
 * @param  {String} nodeModules - `node_modules` base directory.
 * @param  {String} parentTarget - relative parent's node_modules path.
 * @param  {String} name - name of the dependency.
 * @return {Observable} - observable sequence of `package.json` objects.
 */
export function resolveFromNodeModules (nodeModules, parentTarget, name) {
	const linkname = path.join(nodeModules, parentTarget, 'node_modules', name)
	log(`resolving ${linkname} from node_modules`)

	return util.readlink(linkname)::mergeMap((rel) => {
		const target = path.basename(path.dirname(rel))
		const filename = path.join(linkname, 'package.json')
		log(`reading package.json from ${filename}`)

		return util.readFileJSON(filename)::map((pkgJson) => ({
			parentTarget, pkgJson, target, name, type: LOCAL
		}))
	})
}

export function resolveFromRegistry (nodeModules, parentTarget, name, version) {
	log(`resolving ${name}@${version} from ${nodeModules} via ${nodeModules}`)

	return registry.match(name, version)::map((pkgJson) => {
		const target = pkgJson.dist.shasum
		log(`resolved ${name}@${version} to ${target}`)

		return { parentTarget, pkgJson, target, name, type: REGISTRY }
	})
}

/**
 * resolve an individual sub-dependency based on the parent's target and the
 * current working directory.
 * @param  {String} nodeModules - `node_modules` base directory.
 * @param  {String} parentTarget - target path used for determining the sub-
 * dependency's path.
 * @return {Obserable} - observable sequence of `package.json` root documents
 * wrapped into dependency objects representing the resolved sub-dependency.
 */
export function resolve (nodeModules, parentTarget) {
	return this::mergeMap(([name, version]) => {
		progress.add()
		progress.report(`resolving ${name}@${version}`)
		log(`resolving ${name}@${version}`)

		return resolveFromNodeModules(nodeModules, parentTarget, name)
			::_catch((error) => {
				if (error.code !== 'ENOENT') {
					throw error
				}
				log(`failed to resolve ${name}@${version} from local ${parentTarget} via ${nodeModules}`)
				return resolveFromRegistry(nodeModules, parentTarget, name, version)
			})
			::_finally(progress.complete)
	})
}

/**
 * resolve all dependencies starting at the current working directory.
 * @param  {String} nodeModules - `node_modules` base directory.
 * @param  {Object} [targets=Object.create(null)] - resolved / active targets.
 * @return {Observable} - an observable sequence of resolved dependencies.
 */
export function resolveAll (nodeModules, targets = Object.create(null)) {
	return this::expand(({target, pkgJson}) => {
		// cancel when we get into a circular dependency
		if (target in targets) {
			log(`aborting due to circular dependency ${target}`)
			return EmptyObservable.create()
		}

		targets[target] = true

		// install devDependencies of entry dependency (project-level)
		const fields = target === '..' ? ENTRY_DEPENDENCY_FIELDS : DEPENDENCY_FIELDS

		log(`extracting ${fields} from ${target}`)

		const dependencies = parseDependencies(pkgJson, fields)

		return ArrayObservable.create(dependencies)
			::resolve(nodeModules, target)
	})
}

function resolveSymlink (src, dst) {
	const relSrc = path.relative(path.dirname(dst), src)
	return [relSrc, dst]
}

function getBinLinks (dep) {
	const {pkgJson, parentTarget, target} = dep
	const binLinks = []
	const bin = normalizeBin(pkgJson)
	const names = Object.keys(bin)
	for (let i = 0; i < names.length; i++) {
		const name = names[i]
		const src = path.join('node_modules', target, 'package', bin[name])
		const dst = path.join('node_modules', parentTarget, 'node_modules', '.bin', name)
		binLinks.push([src, dst])
	}
	return binLinks
}

function getDirectLink (dep) {
	const {parentTarget, target, name} = dep
	const src = path.join('node_modules', target, 'package')
	const dst = path.join('node_modules', parentTarget, 'node_modules', name)
	return [src, dst]
}

/**
 * symlink the intermediate results of the underlying observable sequence
 * @param  {String} nodeModules - `node_modules` base directory.
 * @return {Observable} - empty observable sequence that will be completed
 * once all dependencies have been symlinked.
 */
export function linkAll (nodeModules) {
	return this
		::mergeMap((dep) => [getDirectLink(dep), ...getBinLinks(dep)])
		::map(([src, dst]) => resolveSymlink(src, dst))
		::mergeMap(([src, dst]) => {
			log(`symlinking ${src} -> ${dst}`)
			return util.forceSymlink(src, dst)
		})
}

export class CorruptedPackageError extends Error {
	/**
	 * create instance.
	 * @param  {String} tarball  - tarball url from which the corresponding
	 * tarball has been downloaded.
	 * @param  {String} expected - expected shasum.
	 * @param  {String} actual   - actual shasum.
	 */
	constructor (tarball, expected, actual) {
		super(`shasum mismatch while downloading ${tarball}: ${actual} <-> ${expected}`)
		this.name = 'CorruptedPackageError'
		this.tarball = tarball
		this.expected = expected
		this.actual = actual
	}
}

function download (tarball, expectedShasum) {
	log(`downloading ${tarball}, expecting ${expectedShasum}`)
	return Observable.create((observer) => {
		const errorHandler = (error) => observer.error(error)
		const dataHandler = (chunk) => shasum.update(chunk)
		const finishHandler = () => {
			const actualShasum = shasum.digest('hex')
			log(`downloaded ${actualShasum} into ${cached.path}`)
			observer.next({ tmpPath: cached.path, shasum: actualShasum })
			observer.complete()
		}

		const shasum = crypto.createHash('sha1')
		const response = needle.get(tarball, config.httpOptions)
		const cached = response.pipe(cache.write())

		response.on('data', dataHandler)
		response.on('error', errorHandler)

		cached.on('error', errorHandler)
		cached.on('finish', finishHandler)
	})
	::mergeMap(({ tmpPath, shasum }) => {
		if (expectedShasum && expectedShasum !== shasum) {
			throw new CorruptedPackageError(tarball, expectedShasum, shasum)
		}

		const newPath = path.join(config.cacheDir, shasum)
		return util.rename(tmpPath, newPath)
	})
}

function fixPermissions (target, bin) {
	const execMode = 0o777 & (~process.umask())
	const paths = []
	const names = Object.keys(bin)
	for (let i = 0; i < names.length; i++) {
		const name = names[i]
		paths.push(path.resolve(target, bin[name]))
	}
	log(`fixing persmissions of ${names} in ${target}`)
	return ArrayObservable.create(paths)
		::mergeMap((path) => util.chmod(path, execMode))
}

function fetch (nodeModules, dep) {
	const {target, pkgJson: {name, bin, dist: {tarball, shasum} }} = dep
	const where = path.join(nodeModules, target, 'package')

	log(`fetching ${tarball} into ${where}`)

	return util.stat(where)::skip(1)::_catch((error) => {
		if (error.code !== 'ENOENT') {
			throw error
		}
		const extracted = cache.extract(where, shasum)::_catch((error) => {
			if (error.code !== 'ENOENT') {
				throw error
			}
			return concatStatic(
				download(tarball, shasum),
				cache.extract(where, shasum)
			)
		})
		const fixedPermissions = fixPermissions(where, normalizeBin({ name, bin }))
		return concatStatic(extracted, fixedPermissions)
	})
}

export function fetchAll (nodeModules) {
	return this
		::distinctKey('target')
		::filter(({type}) => type !== LOCAL)
		::mergeMap((dep) => fetch(nodeModules, dep))
}

