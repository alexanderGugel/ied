import {ArrayObservable} from 'rxjs/observable/ArrayObservable'
import {EmptyObservable} from 'rxjs/observable/EmptyObservable'
import {expand} from 'rxjs/operator/expand'
import {map} from 'rxjs/operator/map'
import {mergeMap} from 'rxjs/operator/mergeMap'
import {concatStatic} from 'rxjs/operator/concat'
import {first} from 'rxjs/operator/first'

import localStrategy from './local_strategy'
import registryStrategy from './registry_strategy'
import {parseDependencies} from './pkg_json'

export const ENTRY_DEP_FIELDS = [
	'dependencies',
	'devDependencies',
	'optionalDependencies'
]

export const DEP_FIELDS = [
	'dependencies',
	'optionalDependencies'
]

const y = (dir, pId) => ([name, version]) =>
	concatStatic(
		localStrategy(dir, pId)(name, version),
		registryStrategy(dir, pId)(name, version)
	)
	::first()
	::map(x => ({...x, name, version, pId}))


export default function (dir) {
	const locks = Object.create(null)

	return this::expand(({id: pId, isEntry, isProd, pkgJson}) => {
		if (pId in locks) return EmptyObservable.create()
		locks[pId] = true

		// install devDependencies of entry dependency (project-level)
		const fields = (isEntry && !isProd) ? ENTRY_DEP_FIELDS : DEP_FIELDS

		const nameVersionPairs = parseDependencies(pkgJson, fields)
		return ArrayObservable.create(nameVersionPairs)::mergeMap(y(dir, pId))
	})
}

