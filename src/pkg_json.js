import fromPairs from 'lodash.frompairs'
import path from 'path'
import {ScalarObservable} from 'rxjs/observable/ScalarObservable'
import {_catch} from 'rxjs/operator/catch'
import {map} from 'rxjs/operator/map'
import {mergeMap} from 'rxjs/operator/mergeMap'

import * as util from './util'

/**
 * Merges dependency fields.
 * @param  {Object} pkgJson - `package.json` object from which the dependencies
 *     should be obtained.
 * @param  {Array.<string>} fields - Property names of dependencies to be merged
 *     together.
 * @return {Object} Merged dependencies.
 */
export const mergeDependencies = (pkgJson, fields) => {
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
 * Extracts an array of bundled dependency names from the passed in
 * `package.json`. Uses the `bundleDependencies` and `bundledDependencies`
 * properties.
 * @param  {Object} pkgJson - Plain JavaScript object representing a
 *     `package.json` file.
 * @return {Array.<string>} Array of bundled dependency names.
 */
export const parseBundleDependencies = pkgJson =>
	[]
		.concat(pkgJson.bundleDependencies || [])
		.concat(pkgJson.bundledDependencies || [])

/**
 * Extracts specified dependencies from a specific `package.json`.
 * @param  {Object} pkgJson - Plain JavaScript object representing a
 * `package.json` file.
 * @param  {Array.<string>} fields - Array of dependency fields to be followed.
 * @return {Array.<Array.<string>} Array of dependency pairs.
 */
export const parseDependencies = (pkgJson, fields) => {
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
 * Normalizes the `bin` property in `package.json`, which could either be a
 * string, object or undefined.
 * @param  {Object} pkgJson - Plain JavaScript object representing a
 * `package.json` file.
 * @return {Object} Normalized `bin` property.
 */
export const normalizeBin = pkgJson => {
	switch (typeof pkgJson.bin) {
		case 'string': return ({[pkgJson.name]: pkgJson.bin})
		case 'object': return pkgJson.bin
		default: return {}
	}
}

/**
 * Create an instance by reading a `package.json` from disk.
 * @param  {string} baseDir - Base directory of the project.
 * @return {Observable} Observable sequence of an `EntryDep`.
 */
export const fromFs = baseDir => {
	const filename = path.join(baseDir, 'package.json')
	return util.readFileJSON(filename)
}

export const updatePkgJson = (pkgJson, diff) => {
	const updatedPkgJson = {...pkgJson}
	const fields = Object.keys(diff)
	for (const field of fields) {
		updatedPkgJson[field] = {
			...updatedPkgJson[field],
			...diff[field]
		}
	}
	return updatedPkgJson
}

export function save (baseDir) {
	const filename = path.join(baseDir, 'package.json')

	return this
		::mergeMap(diff => fromFs(baseDir)
			::_catch(() => ScalarObservable.create({}))
			::map(pkgJson => updatePkgJson(pkgJson, diff))
		)
		::map(pkgJson => JSON.stringify(pkgJson, null, '\t'))
		::mergeMap(pkgJson => util.writeFile(filename, pkgJson, 'utf8'))
}

const argvRegExp = /^(@?.+?)(?:@(.+)?)?$/

/**
 * Parses the command line arguments and create the dependency field of a
 * `package.json` file from it.
 * @param  {Array} argv - Command line arguments.
 * @return {NullPkgJSON} - `package.json` created from explicit dependencies
 *     supplied via command line arguments.
 */
export const parseArgv = argv => {
	const names = argv._.slice(1)

	const nameVersionPairs = fromPairs(names.map((target) => {
		const nameVersion = argvRegExp.exec(target)
		return [nameVersion[1], nameVersion[2] || '*']
	}))

	const field = argv['save-dev'] ? 'devDependencies'
		: argv['save-optional'] ? 'optionalDependencies'
		: 'dependencies'

	return {[field]: nameVersionPairs}
}

/**
 * Creates an instance by parsing the explicit dependencies supplied via
 * command line arguments.
 * @param  {string} baseDir - Base directory of the project.
 * @param  {Array} argv - Command line arguments.
 * @return {Observable} Observable sequence of an `EntryDep`.
 */
export const fromArgv = (baseDir, argv) => {
	const pkgJson = parseArgv(argv)
	return ScalarObservable.create(pkgJson)
}
