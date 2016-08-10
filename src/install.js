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
import {map} from 'rxjs/operator/map'
import {_catch} from 'rxjs/operator/catch'
import {mergeMap} from 'rxjs/operator/mergeMap'
import {retry} from 'rxjs/operator/retry'
import {skip} from 'rxjs/operator/skip'
import needle from 'needle'
import assert from 'assert'
import npa from 'npm-package-arg'
import memoize from 'lodash.memoize'

import * as cache from './cache'
import * as config from './config'
import * as registry from './registry'
import * as local from './local'
import * as git from './git'
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
 * resolve a dependency's `package.json` file from a remote registry.
 * @param	{String} nodeModules - `node_modules` base directory.
 * @param	{String} parentTarget - relative parent's node_modules path.
 * @param	{String} name - name of the dependency.
 * @param	{String} version - version of the dependency.
 * @return {Observable} - observable sequence of `package.json` objects.
 */
export function resolveRemote (nodeModules, parentTarget, name, version) {
	const source = `${name}@${version}`
	log(`resolving ${source} from remote registry`)

	const parsedSpec = cachedNpa(source)

	switch (parsedSpec.type) {
		case 'range':
		case 'version':
		case 'tag':
			return registry.resolve(nodeModules, parentTarget, name, version, {
				...config.httpOptions,
				registry: config.registry
			})
		case 'remote':
			return resolveFromTarball(nodeModules, parentTarget, parsedSpec)
		case 'hosted':
			return resolveFromHosted(nodeModules, parentTarget, parsedSpec)
		case 'git':
			return resolveFromGit(nodeModules, parentTarget, parsedSpec)
		default:
			throw new Error(`Unknown package spec: ${parsedSpec.type} for ${name}`)
	}
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
		observer.next({parentTarget, pkgJson, target: shasum, name, type, fetch})
		observer.complete()
	})
}

/**
 * resolve a dependency's `package.json` file from an hosted GitHub-like registry.
 * @param	{String} nodeModules - `node_modules` base directory.
 * @param	{String} parentTarget - relative parent's node_modules path.
 * @param	{Object} parsedSpec - parsed package name and specifier.
 * @return {Observable} - observable sequence of `package.json` objects.
 */
export function resolveFromHosted (nodeModules, parentTarget, parsedSpec) {
	const {raw, name, type, hosted} = parsedSpec
	log(`resolving ${raw} from ${hosted.type}`)

	const [provider, shortcut] = hosted.shortcut.split(':')
	const [repo, ref = 'master'] = shortcut.split('#')

	const options = {...config.httpOptions, retries: config.retries}
	// create shasum from directUrl for storage
	const hash = crypto.createHash('sha1')
	hash.update(hosted.directUrl)
	const shasum = hash.digest('hex')

	let tarball
	switch (hosted.type) {
		case 'github':
			tarball = url.resolve('https://codeload.github.com', `${repo}/tar.gz/${ref}`)
			break
		case 'bitbucket':
			tarball = url.resolve('https://bitbucket.org', `${repo}/get/${ref}.tar.gz`)
			break
		default:
			throw new Error(`Unknown hosted type: ${hosted.type} for ${name}`)
	}

	return registry.getJson(hosted.directUrl, options)
		::map(({body}) => JSON.parse(body))
		::map(pkgJson => {
			pkgJson.dist = {tarball, shasum} // eslint-disable-line no-param-reassign
			log(`resolved ${name}@${ref} to directUrl shasum ${shasum} from ${provider}`)
			return {parentTarget, pkgJson, target: shasum, name: pkgJson.name, type, fetch}
		})
}

/**
 * resolve a dependency's `package.json` file from a git endpoint.
 * @param	{String} nodeModules - `node_modules` base directory.
 * @param	{String} parentTarget - relative parent's node_modules path.
 * @param	{Object} parsedSpec - parsed package name and specifier.
 * @return {Observable} - observable sequence of `package.json` objects.
 */
export function resolveFromGit (nodeModules, parentTarget, parsedSpec) {
	const {raw, type, spec} = parsedSpec
	log(`resolving ${raw} from git`)

	const [protocol, host] = spec.split('://')
	const [repo, ref = 'master'] = host.split('#')

	// create shasum from spec for storage
	const hash = crypto.createHash('sha1')
	hash.update(spec)
	const shasum = hash.digest('hex')
	let repoPath

	return git.clone(repo, ref)
		::mergeMap(tmpDest => {
			repoPath = tmpDest
			return util.readFileJSON(path.resolve(tmpDest, 'package.json'))
		})
		::map(pkgJson => {
			const name = pkgJson.name
			pkgJson.dist = {shasum, path: repoPath} // eslint-disable-line no-param-reassign
			log(`resolved ${name}@${ref} to spec shasum ${shasum} from git`)
			return {parentTarget, pkgJson, target: shasum, name, type, fetch: git.extract}
		})
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

		return local.resolve(nodeModules, parentTarget, name, version, isExplicit)
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
	return this::expand(({target, pkgJson, isProd = false}) => {
		// cancel when we get into a circular dependency
		if (target in targets) {
			log(`aborting due to circular dependency ${target}`)
			return EmptyObservable.create()
		}

		targets[target] = true // eslint-disable-line no-param-reassign

		// install devDependencies of entry dependency (project-level)
		const fields = (target === '..' && !isProd)
			? ENTRY_DEPENDENCY_FIELDS
			: DEPENDENCY_FIELDS

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
 * @return {Observable} - empty observable sequence that will be completed
 * once all dependencies have been symlinked.
 */
export function linkAll () {
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
		const shasum = crypto.createHash('sha1')
		const response = needle.get(tarball, config.httpOptions)
		const cached = response.pipe(cache.write())

		const errorHandler = (error) => observer.error(error)
		const dataHandler = (chunk) => shasum.update(chunk)
		const finishHandler = () => {
			const actualShasum = shasum.digest('hex')
			log(`downloaded ${actualShasum} into ${cached.path}`)
			// only actually check shasum integrity for npm tarballs
			const expectedShasum = ['range', 'version', 'tag'].indexOf(type) !== -1 ?
				actualShasum : expected
			observer.next({tmpPath: cached.path, shasum: expectedShasum})
			observer.complete()
		}

		response.on('data', dataHandler)
		response.on('error', errorHandler)

		cached.on('error', errorHandler)
		cached.on('finish', finishHandler)
	})
	::mergeMap(({tmpPath, shasum}) => {
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
		::mergeMap((filepath) => util.chmod(filepath, execMode))
}

export function fetch (nodeModules) {
	const {target, type, pkgJson: {name, bin, dist: {tarball, shasum}}} = this
	const where = path.join(nodeModules, target, 'package')

	log(`fetching ${tarball} into ${where}`)

	return util.stat(where)::skip(1)::_catch((error) => {
		if (error.code !== 'ENOENT') {
			throw error
		}
		const extracted = cache.extract(where, shasum)::_catch((error) => { // eslint-disable-line
			if (error.code !== 'ENOENT') {
				throw error
			}
			return concatStatic(
				download(tarball, shasum, type),
				cache.extract(where, shasum)
			)
		})
		const fixedPermissions = fixPermissions(where, normalizeBin({name, bin}))
		return concatStatic(extracted, fixedPermissions)
	})
}

export function fetchAll (nodeModules) {
	const fetchWithRetry = (dep) => dep.fetch(nodeModules)::retry(config.retries)
	return this::distinctKey('target')::mergeMap(fetchWithRetry)
}
