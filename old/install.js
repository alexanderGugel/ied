import crypto from 'crypto'
import path from 'path'
import url from 'url'
import {ArrayObservable} from 'rxjs/observable/ArrayObservable'
import {Observable} from 'rxjs/Observable'
import {concatStatic} from 'rxjs/operator/concat'
import {first} from 'rxjs/operator/first'
import {map} from 'rxjs/operator/map'
import {_catch} from 'rxjs/operator/catch'
import {mergeMap} from 'rxjs/operator/mergeMap'
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
import {normalizeBin} from './pkg_json'

import debuglog from './debuglog'

const log = debuglog('install')
const cachedNpa = memoize(npa)

/**
 * resolve a dependency's `package.json` file from a remote registry.
 * @param	{string} nodeModules - `node_modules` base directory.
 * @param	{string} parentTarget - relative parent's node_modules path.
 * @param	{string} name - name of the dependency.
 * @param	{string} version - version of the dependency.
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
 * @param	{string} nodeModules - `node_modules` base directory.
 * @param	{string} parentTarget - relative parent's node_modules path.
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
 * @param	{string} nodeModules - `node_modules` base directory.
 * @param	{string} parentTarget - relative parent's node_modules path.
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
 * @param	{string} nodeModules - `node_modules` base directory.
 * @param	{string} parentTarget - relative parent's node_modules path.
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

export const checkShasum = (shasum, expected, tarball) =>
	void assert.equal(shasum, expected,
		`shasum mismatch for ${tarball}: ${shasum} <-> ${expected}`)

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
