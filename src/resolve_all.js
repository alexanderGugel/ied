import {ArrayObservable} from 'rxjs/observable/ArrayObservable'
import {EmptyObservable} from 'rxjs/observable/EmptyObservable'
import {_finally} from 'rxjs/operator/finally'
import {concatStatic} from 'rxjs/operator/concat'
import {expand} from 'rxjs/operator/expand'
import {first} from 'rxjs/operator/first'
import {mergeMap} from 'rxjs/operator/mergeMap'

import {add, complete, report} from './progress'
import {parseDependencies} from './pkg_json'
import {resolve as resolveFromLocal} from './local'
import {resolve as resolveFromRegistry} from './registry'

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
 * dependencies.
 * @type {Array.<String>}
 * @readonly
 */
export const DEPENDENCY_FIELDS = [
	'dependencies',
	'optionalDependencies'
]

function resolve (nodeModules, parentTarget, config) {
	return this::mergeMap(([name, version]) => {
		add()
		report(`resolving ${name}@${version}`)

		return concatStatic(
			resolveFromLocal(nodeModules, parentTarget, name),
			resolveFromRegistry(nodeModules, parentTarget, name, version, {
				...config.httpOptions,
				registry: config.registry
			})
		)
			::first()
			::_finally(complete)
	})
}

export default function resolveAll (nodeModules, config) {
	const targets = Object.create(null)
	const entryTarget = '..'

	return this::expand(result => {
		if (targets[result.target]) {
			return EmptyObservable.create()
		}
		targets[result.target] = true
		const isEntry = result.target === entryTarget && !result.isProd
		const fields = isEntry ? ENTRY_DEPENDENCY_FIELDS : DEPENDENCY_FIELDS
		return ArrayObservable.create(parseDependencies(result.pkgJson, fields))
			::resolve(nodeModules, result.target, config)
	})
}
