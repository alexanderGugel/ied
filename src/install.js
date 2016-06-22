import crypto from 'crypto'
import path from 'path'
import url from 'url'
import {ArrayObservable} from 'rxjs/observable/ArrayObservable'
import {EmptyObservable} from 'rxjs/observable/EmptyObservable'
import {Observable} from 'rxjs/Observable'
import {_finally} from 'rxjs/operator/finally'
import {concatStatic} from 'rxjs/operator/concat'
import {distinctKey} from 'rxjs/operator/distinctKey'
import {expand} from 'rxjs/operator/expand'
import {forkJoin as forkJoinStatic} from 'rxjs/observable/forkJoin'
import {map} from 'rxjs/operator/map'
import {_catch} from 'rxjs/operator/catch'
import {mergeMap} from 'rxjs/operator/mergeMap'
import {retry} from 'rxjs/operator/retry'
import {skip} from 'rxjs/operator/skip'
import {satisfies} from 'semver'
import needle from 'needle'
import assert from 'assert'
import npa from 'npm-package-arg'
import memoize from 'lodash.memoize'

import * as cache from './cache'
import * as config from './config'
import * as registry from './registry'
import * as util from './util'
import * as progress from './progress'
import {normalizeBin, parseDependencies} from './pkg_json'

import debuglog from './debuglog'

const log = debuglog('install')
const cachedNpa = memoize(npa)

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
 * error class used for representing an error that occurs due to a lifecycle
 * script that exits with a non-zero status code.
 */
export class LocalConflictError extends Error {
	/**
	 * create instance.
 	 * @param	{String} name - name of the dependency.
 	 * @param	{String} version - local version.
 	 * @param	{String} expected - expected version.
	 */
	constructor (name, version, expected) {
		super(`Local version ${name}@${version} does not match required version @${expected}`)
		this.name = 'LocalConflictError'
	}
}

/**
 * resolve a dependency's `package.json` file from the local file system.
 * @param	{String} nodeModules - `node_modules` base directory.
 * @param	{String} parentTarget - relative parent's node_modules path.
 * @param	{String} name - name of the dependency.
 * @param	{String} version - version of the dependency.
 * @param	{Boolean} isExplicit - whether the install command asks for an explicit install.
 * @return {Observable} - observable sequence of `package.json` objects.
 */
export function resolveLocal (nodeModules, parentTarget, name, version, isExplicit) {
	const linkname = path.join(nodeModules, parentTarget, 'node_modules', name)
	const fetch = () => EmptyObservable.create()
	log(`resolving ${linkname} from node_modules`)

	// support `file:` with symlinks
	if (version.substr(0, 5) === 'file:') {
		log(`resolved ${name}@${version} as local symlink`)
		const isScoped = name.charAt(0) === '@'
		const src = path.join(parentTarget, isScoped ? '..' : '', version.substr(5))
		const dst = path.join('node_modules', parentTarget, 'node_modules', name)
		return util.forceSymlink(src, dst)::_finally(progress.complete)
	}

	return util.readlink(linkname)::mergeMap((rel) => {
		const target = path.basename(path.dirname(rel))
		const filename = path.join(linkname, 'package.json')
		log(`reading package.json from ${filename}`)

		return util.readFileJSON(filename)::map((pkgJson) => {
			if (isExplicit && !satisfies(pkgJson.version, version)) {
				throw new LocalConflictError(name, pkgJson.version, version)
			}
			return {parentTarget, pkgJson, target, name, fetch}
		})
	})
}

/**
 * resolve a dependency's `package.json` file from a remote registry.
 * @param	{String} nodeModules - `node_modules` base directory.
 * @param	{String} parentTarget - relative parent's node_modules path.
 * @param	{String} name - name of the dependency.
 * @param	{String} version - version of the dependency.
 * @param	{Boolean} isExplicit - whether the install command asks for an explicit install.
 * @return {Observable} - observable sequence of `package.json` objects.
 */
export function resolveRemote (nodeModules, parentTarget, name, version, isExplicit) {
	const source = `${name}@${version}`
	log(`resolving ${source} from remote registry`)

	const parsedSpec = cachedNpa(source)

	switch (parsedSpec.type) {
		case 'range':
		case 'version':
		case 'tag':
			return resolveFromNpm(nodeModules, parentTarget, parsedSpec)
		case 'remote':
			return resolveFromTarball(nodeModules, parentTarget, parsedSpec)
		case 'hosted':
			return resolveFromGitHub(nodeModules, parentTarget, parsedSpec)
		default:
			throw new Error('Unknown package spec: ' + parsedSpec.type + ' for ' + name)
	}
}

/**
 * resolve a dependency's `package.json` file from the npm registry.
 * @param	{String} nodeModules - `node_modules` base directory.
 * @param	{String} parentTarget - relative parent's node_modules path.
 * @param	{Object} parsedSpec - parsed package name and specifier.
 * @return {Observable} - observable sequence of `package.json` objects.
 */
export function resolveFromNpm (nodeModules, parentTarget, parsedSpec) {
	const {raw, name, type, spec} = parsedSpec
	log(`resolving ${raw} from npm`)
	const options = {...config.httpOptions, retries: config.retries}
	return registry.match(name, spec, options)::map((pkgJson) => {
		const target = pkgJson.dist.shasum
		log(`resolved ${raw} to tarball shasum ${target} from npm`)
		return { parentTarget, pkgJson, target, name, type, fetch }
	})
}

/**
 * resolve a dependency's `package.json` file from an url tarball.
 * @param	{String} nodeModules - `node_modules` base directory.
 * @param	{String} parentTarget - relative parent's node_modules path.
 * @param	{Object} parsedSpec - parsed package name and specifier.
 * @return {Observable} - observable sequence of `package.json` objects.
 */
export function resolveFromTarball (nodeModules, parentTarget, parsedSpec) {
	const {raw, name, type, spec} = parsedSpec
	log(`resolving ${raw} from tarball`)
	return Observable.create((observer) => {
		// create shasum from url for storage
		const hash = crypto.createHash('sha1')
		hash.update(raw)
		const shasum = hash.digest('hex')
		const pkgJson = {name, dist: {tarball: spec, shasum}}
		log(`resolved ${raw} to uri shasum ${shasum} from tarball`)
		observer.next({ parentTarget, pkgJson, target: shasum, name, type, fetch })
		observer.complete()
	})
}

/**
 * resolve a dependency's `package.json` file from the github registry.
 * @param	{String} nodeModules - `node_modules` base directory.
 * @param	{String} parentTarget - relative parent's node_modules path.
 * @param	{Object} parsedSpec - parsed package name and specifier.
 * @return {Observable} - observable sequence of `package.json` objects.
 */
export function resolveFromGitHub (nodeModules, parentTarget, parsedSpec) {
	const {raw, name, type, spec, hosted} = parsedSpec
	log(`resolving ${raw} from github`)

	const hashIndex = spec.indexOf('#')
	const ref = hashIndex !== -1 ? spec.substr(hashIndex + 1) : 'master'
	const githubUri = spec.substr(7, hashIndex - 7)

	// fetch hosted package.json to get package name
	const pkgUri = hosted.directUrl
	// fetch specified ref current commit to be used as a shasum for storage
	// @TODO handle GitHub API rejections
	const refUri = url.resolve('https://api.github.com/repos/', githubUri + '/git/refs/heads/' + ref)
	const options = {...config.httpOptions, retries: config.retries}
	return forkJoinStatic(
		registry.fetch(pkgUri, options)::map(({ body }) => JSON.parse(body)),
		registry.fetch(refUri, options)::map(({ body }) => body)
	)::map(([pkgJson, refJson]) => {
		const tarball = url.resolve('https://codeload.github.com/', githubUri + '/tar.gz/' + ref)
		const shasum = refJson.object.sha
		pkgJson.dist = {tarball, shasum}
		log(`resolved ${name}@${ref} to commit shasum ${shasum} from github`)
		return { parentTarget, pkgJson, target: shasum, name: pkgJson.name, type, fetch }
	}, {})
}

/**
 * resolve an individual sub-dependency based on the parent's target and the
 * current working directory.
 * @param	{String} nodeModules - `node_modules` base directory.
 * @param	{String} parentTarget - target path used for determining the sub-
 * dependency's path.
 * @param	{Boolean} isExplicit - whether the install command asks for an explicit install.
 * @return {Obserable} - observable sequence of `package.json` root documents
 * wrapped into dependency objects representing the resolved sub-dependency.
 */
export function resolve (nodeModules, parentTarget, isExplicit) {
	return this::mergeMap(([name, version]) => {
		progress.add()
		progress.report(`resolving ${name}@${version}`)
		log(`resolving ${name}@${version}`)

		return resolveLocal(nodeModules, parentTarget, name, version, isExplicit)
			::_catch((error) => {
				if (error.name !== 'LocalConflictError' && error.code !== 'ENOENT') {
					throw error
				}
				log(`failed to resolve ${name}@${version} from local ${parentTarget} via ${nodeModules}`)
				return resolveRemote(nodeModules, parentTarget, name, version, isExplicit)
			})
			::_finally(progress.complete)
	})
}

/**
 * resolve all dependencies starting at the current working directory.
 * @param	{String} nodeModules - `node_modules` base directory.
 * @param	{Object} [targets=Object.create(null)] - resolved / active targets.
 * @param	{Boolean} isExplicit - whether the install command asks for an explicit install.
 * @return {Observable} - an observable sequence of resolved dependencies.
 */
export function resolveAll (nodeModules, targets = Object.create(null), isExplicit) {
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
			::resolve(nodeModules, target, isExplicit)
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
 * @param	{String} nodeModules - `node_modules` base directory.
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

function checkShasum (shasum, expected, tarball) {
	assert.equal(shasum, expected,
		`shasum mismatch for ${tarball}: ${shasum} <-> ${expected}`)
}

function download (tarball, expected, type) {
	log(`downloading ${tarball}, expecting ${expected}`)
	return Observable.create((observer) => {
		const errorHandler = (error) => observer.error(error)
		const dataHandler = (chunk) => shasum.update(chunk)
		const finishHandler = () => {
			const actualShasum = shasum.digest('hex')
			log(`downloaded ${actualShasum} into ${cached.path}`)
			// only actually check shasum integrity for npm tarballs
			const expectedShasum = ['range', 'version', 'tag'].indexOf(type) !== -1 ? actualShasum : expected
			observer.next({ tmpPath: cached.path, shasum: expectedShasum })
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
		if (expected) {
			checkShasum(shasum, expected, tarball)
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

function fetch (nodeModules) {
	const {target, type, pkgJson: {name, bin, dist: {tarball, shasum}}} = this
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
				download(tarball, shasum, type),
				cache.extract(where, shasum)
			)
		})
		const fixedPermissions = fixPermissions(where, normalizeBin({ name, bin }))
		return concatStatic(extracted, fixedPermissions)
	})
}

export function fetchAll (nodeModules) {
	const fetch = (dep) => dep.fetch(nodeModules)::retry(config.retries)
	return this::distinctKey('target')::mergeMap(fetch)
}
