import path from 'path'
import {ArrayObservable} from 'rxjs/observable/ArrayObservable'
import {EmptyObservable} from 'rxjs/observable/EmptyObservable'
import {distinctKey} from 'rxjs/operator/distinctKey'
import {expand} from 'rxjs/operator/expand'
import {map} from 'rxjs/operator/map'
import {mergeMap} from 'rxjs/operator/mergeMap'
import {_catch} from 'rxjs/operator/catch'
import {retry} from 'rxjs/operator/retry'
import {localStrategy, registryStrategy} from './strategies'

import * as config from './config'
import * as util from './util'
import {normalizeBin, parseDependencies} from './pkg_json'

export const ENTRY_DEP_FIELDS = [
	'dependencies',
	'devDependencies',
	'optionalDependencies'
]

export const DEP_FIELDS = [
	'dependencies',
	'optionalDependencies'
]

export const strategies = [
	localStrategy,
	registryStrategy
]

function createResolver (baseDir, pId) {
	return this::mergeMap(([name, version]) =>
		localStrategy.resolve(baseDir, pId, name, version)
			::_catch(error => {
				if (error.code !== 'ENOENT') throw error
				return registryStrategy.resolve(baseDir, pId, name, version)
			})
		::map(x => ({...x, name, version, pId}))
	)
}

export function resolveAll (baseDir) {
	const locks = Object.create(null)

	return this::expand((parent) => {
		if (parent.id in locks) {
			return EmptyObservable.create()
		}

		locks[parent.id] = true

		// install devDependencies of entry dependency (project-level)
		const fields = (parent.isEntry && !parent.isProd)
			? ENTRY_DEP_FIELDS
			: DEP_FIELDS

		const dependencies = parseDependencies(parent.pkgJson, fields)
		return ArrayObservable.create(dependencies)
			::createResolver(baseDir, parent.id)
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
