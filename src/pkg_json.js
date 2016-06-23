import path from 'path'
import {ScalarObservable} from 'rxjs/observable/ScalarObservable'
import fromPairs from 'lodash.frompairs'
import {map} from 'rxjs/operator/map'
import {mergeMap} from 'rxjs/operator/mergeMap'
import {_catch} from 'rxjs/operator/catch'

import * as util from './util'

/**
 * merge dependency fields.
 * @param  {Object} pkgJson - `package.json` object from which the dependencies
 * should be obtained.
 * @param  {Array.<String>} fields - property names of dependencies to be merged
 * together.
 * @return {Object} - merged dependencies.
 */
export function mergeDependencies (pkgJson, fields) {
	const allDependencies = {}
	for (let i = 0; i < fields.length; i++) {
		const field = fields[i]
		const dependencies = pkgJson[field] || {}
		const names = Object.keys(dependencies)
		for (let j = 0; j < names.length; j++) {
			const name = names[j]
			allDependencies[name] = dependencies[name]
		}
	}
	return allDependencies
}

/**
 * extract an array of bundled dependency names from the passed in
 * `package.json`. uses the `bundleDependencies` and `bundledDependencies`
 * properties.
 * @param  {Object} pkgJson - plain JavaScript object representing a
 * `package.json` file.
 * @return {Array.<String>} - array of bundled dependency names.
 */
export function parseBundleDependencies (pkgJson) {
	const bundleDependencies = []
		.concat(pkgJson.bundleDependencies || [])
		.concat(pkgJson.bundledDependencies || [])
	return bundleDependencies
}

/**
 * extract specified dependencies from a specific `package.json`.
 * @param  {Object} pkgJson - plain JavaScript object representing a
 * `package.json` file.
 * @param  {Array.<String>} fields - array of dependency fields to be followed.
 * @return {Array} - array of dependency pairs.
 */
export function parseDependencies (pkgJson, fields) {
	// bundleDependencies and bundledDependencies are optional. we need to
	// exclude those form the final [name, version] pairs that we're
	// generating.
	const bundleDependencies = parseBundleDependencies(pkgJson)
	const allDependencies = mergeDependencies(pkgJson, fields)
	const names = Object.keys(allDependencies)
	const results = []
	for (let i = 0; i < names.length; i++) {
		const name = names[i]
		if (bundleDependencies.indexOf(name) === -1) {
			results.push([name, allDependencies[name]])
		}
	}
	return results
}

/**
 * normalize the `bin` property in `package.json`, which could either be a
 * string, object or undefined.
 * @param  {Object} pkgJson - plain JavaScript object representing a
 * `package.json` file.
 * @return {Object} - normalized `bin` property.
 */
export function normalizeBin (pkgJson) {
	switch (typeof pkgJson.bin) {
		case 'string': return ({[pkgJson.name]: pkgJson.bin})
		case 'object': return pkgJson.bin
		default: return {}
	}
}

/**
 * create an instance by reading a `package.json` from disk.
 * @param  {String} baseDir - base directory of the project.
 * @return {Observabel} - an observable sequence of an `EntryDep`.
 */
export function fromFs (baseDir) {
	const filename = path.join(baseDir, 'package.json')
	return util.readFileJSON(filename)
}

export function updatePkgJson (pkgJson, diff) {
	const updatedPkgJson = {...pkgJson}
	Object.keys(diff).forEach(field => {
		updatedPkgJson[field] = {
			...updatedPkgJson[field],
			...diff[field]
		}
	})
	return updatedPkgJson
}

export function save (baseDir) {
	const filename = path.join(baseDir, 'package.json')

	return this
		::mergeMap((diff) => fromFs(baseDir)
			::_catch(() => ScalarObservable.create({}))
			::map((pkgJson) => updatePkgJson(pkgJson, diff))
		)
		::map((pkgJson) => JSON.stringify(pkgJson, null, '\t'))
		::mergeMap((pkgJson) => util.writeFile(filename, pkgJson, 'utf8'))
}

/**
 * create an instance by parsing the explicit dependencies supplied via
 * command line arguments.
 * @param  {String} baseDir - base directory of the project.
 * @param  {Array} argv - command line arguments.
 * @return {Observabel} - an observable sequence of an `EntryDep`.
 */
export function fromArgv (baseDir, argv) {
	const pkgJson = parseArgv(argv)
	return ScalarObservable.create(pkgJson)
}

/**
 * parse the command line arguments and create the dependency field of a
 * `package.json` file from it.
 * @param  {Array} argv - command line arguments.
 * @return {NullPkgJSON} - package.json created from explicit dependencies
 * supplied via command line arguments.
 */
export function parseArgv (argv) {
	const names = argv._.slice(1)

	const nameVersionPairs = fromPairs(names.map((target) => {
		const nameVersion = /^(@?.+?)(?:@(.+)?)?$/.exec(target)
		return [nameVersion[1], nameVersion[2] || '*']
	}))

	const field = argv['save-dev'] ? 'devDependencies'
		: argv['save-optional'] ? 'optionalDependencies'
		: 'dependencies'

	return {[field]: nameVersionPairs}
}
