import {ArrayObservable} from 'rxjs/observable/ArrayObservable'
import {EmptyObservable} from 'rxjs/observable/EmptyObservable'
import {_finally} from 'rxjs/operator/finally'
import {_do} from 'rxjs/operator/do'
import {concatStatic} from 'rxjs/operator/concat'
import {expand} from 'rxjs/operator/expand'
import {first} from 'rxjs/operator/first'
import {mergeMap} from 'rxjs/operator/mergeMap'

import {add, complete, report} from './progress'
import {parseDependencies} from './pkg_json'
import resolveFromLocal from './local'
import resolveFromRegistry from './registry'
import resolveFromTarball from './tarball'

/**
 * Properties of project-level `package.json` files that will be checked for
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
 * Properties of `package.json` of sub-dependencies that will be checked for
 * dependencies.
 * @type {Array.<String>}
 * @readonly
 */
export const DEPENDENCY_FIELDS = [
	'dependencies',
	'optionalDependencies'
]

const logStartResolve = ([name, version = '[no version]']) => {
	add()
	report(`resolving ${name}@${version}`)
}

const compose = fns => (...args) =>
	// TODO Consider using a for-loop here, since V8 doesn't seem to be able to
	// optimize this.
	fns.map(fn => fn(...args))

// Chain of responsibility
const resolveAny = compose([
	resolveFromLocal,
	resolveFromTarball,
	resolveFromRegistry
])

function resolve (nodeModules, pId, options) {
	return this
		::_do(logStartResolve)
		::mergeMap(([name, version]) =>
			concatStatic(...resolveAny(nodeModules, pId, name, version, options))
				::first()
				::_finally(complete)
		)
}

/**
 * Helper class used for implementing a fast, mutable set using a plain
 * JavaScript object. Using Set is unsupported on older Node versions and
 * significantly slower — especially when exclusively using stringified values.
 */
class MutableSet {
	/**
	 * Creates an instance.
	 * @constructor
	 */
	constructor () {
		this.keys = Object.create(null)
	}

	/**
	 * Adds a value to the set. This is slightly different from `Set#add` in the
	 * sense that it doesn't allow chained operations and only handles string
	 * values (hence `keys`).
	 * @param {string} key - Value to be added to the set
	 * @return {boolean} True if the value was add newly added to the set, false
	 *     if the value was already contained in the set.
	 */
	add (key) {
		if (this.keys[key]) return false
		return (this.keys[key] = true)
	}
}

const getFields = ({id, isProd}) => (
	(id === '..' && !isProd)
		? ENTRY_DEPENDENCY_FIELDS
		: DEPENDENCY_FIELDS
)

const resolveAllInner = (nodeModules, options) => result => {
	const {pkgJson, id} = result
	const fields = getFields(result)
	const dependencies = parseDependencies(pkgJson, fields)

	return ArrayObservable.create(dependencies)
		::resolve(nodeModules, id, options)
}

export default function resolveAll (nodeModules, config) {
	const ids = new MutableSet()
	const options = {
		...config.httpOptions,
		registry: config.registry
	}
	const boundResolveAllInner = resolveAllInner(nodeModules, options)

	return this::expand(result => (
		ids.add(result.id)
			? boundResolveAllInner(result)
			: EmptyObservable.create()
	))
}
