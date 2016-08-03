import crypto from 'crypto'
import path from 'path'
import url from 'url'
import {ArrayObservable} from 'rxjs/observable/ArrayObservable'
import {EmptyObservable} from 'rxjs/observable/EmptyObservable'
import {Observable} from 'rxjs/Observable'
import {distinctKey} from 'rxjs/operator/distinctKey'
import {expand} from 'rxjs/operator/expand'
import {map} from 'rxjs/operator/map'
import {mergeMap} from 'rxjs/operator/mergeMap'
import {_catch} from 'rxjs/operator/catch'
import {retry} from 'rxjs/operator/retry'
import npa from 'npm-package-arg'
import memoize from 'lodash.memoize'
import {localStrategy, registryStrategy} from './strategies'

import * as config from './config'
import * as registry from './registry'
import * as git from './git'
import * as util from './util'
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
			return resolveFromNpm(nodeModules, parentTarget, parsedSpec)
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

	return registry.fetch(hosted.directUrl, options)
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
 * resolve all dependencies starting at the current working directory.
 * @param	{String} nodeModules - `node_modules` base directory.
 * @param	{Object} [targets=Object.create(null)] - resolved / active targets.
 * @param	{Boolean} isExplicit - whether the install command asks for an explicit install.
 * @return {Observable} - an observable sequence of resolved dependencies.
 */
export function resolveAll (baseDir, locks = Object.create(null), isExplicit) {
	return this::expand(({id: pId, pkgJson: pPkgJson, isEntry = false, isProd = false}) => {
		// cancel when we get into a circular dependency
		if (pId in locks) return EmptyObservable.create()
		locks[pId] = true // eslint-disable-line no-param-reassign

		// install devDependencies of entry dependency (project-level)
		const fields = (isEntry && !isProd)
			? ENTRY_DEPENDENCY_FIELDS
			: DEPENDENCY_FIELDS

		const dependencies = parseDependencies(pPkgJson, fields)
		return ArrayObservable.create(dependencies)
			::mergeMap(([name, version]) =>
				localStrategy.resolve(baseDir, pId, name, version)
					::_catch((error) => {
						if (error.code !== 'ENOENT') throw error
						return registryStrategy.resolve(baseDir, pId, name, version)
					})
					::map(x => ({...x, name, version, pId}))
			)
	})
}

function resolveSymlink (src, dst) {
	const relSrc = path.relative(path.dirname(dst), src)
	return [relSrc, dst]
}

function getBinLinks (baseDir, pId, id, pkgJson) {
	const binLinks = []
	const bin = normalizeBin(pkgJson)
	const names = Object.keys(bin)
	for (let i = 0; i < names.length; i++) {
		const name = names[i]
		const src = path.join(baseDir, id, 'package', bin[name])
		const dst = path.join(baseDir, pId, 'node_modules', '.bin', name)
		binLinks.push([src, dst])
	}
	return binLinks
}

function getDirectLink (baseDir, pId, id, name) {
	return [
		path.join(baseDir, id, 'package'),
		path.join(baseDir, pId, 'node_modules', name)
	]
}

/**
 * symlink the intermediate results of the underlying observable sequence
 * @return {Observable} - empty observable sequence that will be completed
 * once all dependencies have been symlinked.
 */
export function linkAll (baseDir) {
	return this
		::mergeMap(({pId, id, name, pkgJson}) => [
			getDirectLink(baseDir, pId, id, name),
			...getBinLinks(baseDir, pId, id, pkgJson)
		])
		::map(([src, dst]) => resolveSymlink(src, dst))
		::mergeMap(([src, dst]) => util.forceSymlink(src, dst))
}

export function fetchAll (baseDir) {
	return this::distinctKey('id')::mergeMap((dep) =>
		dep.strategy.fetch.call(null, baseDir, dep)
			::retry(config.retries)
	)
}
