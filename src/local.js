import {EmptyObservable} from 'rxjs/observable/EmptyObservable'
import {_do} from 'rxjs/operator/do'
import {map} from 'rxjs/operator/map'
import {mergeStatic} from 'rxjs/operator/merge'
import {reduce} from 'rxjs/operator/reduce'

import path from 'path'
import {inherits} from 'util'
import {satisfies} from 'semver'

import * as util from './util'

// thrown when the currently installed version does not satisfy the semantic
// version constraint.
inherits(LocalConflictError, Error)
function LocalConflictError (name, version, expected) {
	Error.captureStackTrace(this, this.constructor)
	this.name = 'LocalConflictError'
	this.message = `Local version ${name}@${version} does not match required\
version @${expected}`
	this.extra = {name, version, expected}
}

export const fetch = () =>
	EmptyObservable.create()

const getLinkname = (nodeModules, parentTarget, name) =>
	path.join(nodeModules, parentTarget, 'node_modules', name)

const getTarget = dst => ({
	target: path.basename(path.dirname(dst))
})

const checkConflict = (name, version) => ({pkgJson}) => {
	if (!satisfies(pkgJson.version, version)) {
		throw new LocalConflictError(name, pkgJson.version, version)
	}
}

const readTarget = linkname =>
	util.readlink(linkname)::map(getTarget)

const readPkgJson = filename =>
	util.readFile(filename, 'utf8')
		::map(JSON.parse)
		::map(pkgJson => ({pkgJson}))

const acc = (_, x) =>
	({..._, ...x})

export const resolve = (nodeModules, parentTarget, name, version, isExplicit) => {
	const linkname = getLinkname(nodeModules, parentTarget, name)
	const filename = path.join(linkname, 'package.json')

	return mergeStatic(
		readTarget(linkname),
		readPkgJson(filename)
	)
		::reduce(acc, {parentTarget, name, fetch})
		::_do(
			isExplicit
			? checkConflict(name, version)
			: Function.prototype
		)
}
