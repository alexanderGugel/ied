import path from 'path'
import {EmptyObservable} from 'rxjs/observable/EmptyObservable'
import {_do} from 'rxjs/operator/do'
import {map} from 'rxjs/operator/map'
import {mergeMap} from 'rxjs/operator/mergeMap'
import {satisfies} from 'semver'
import {inherits} from 'util'

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

// TODO should not happen in resolve
// support `file:` with symlinks
// if (version.substr(0, 5) === 'file:') {
// 	const isScoped = name.charAt(0) === '@'
// 	const src = path.join(parentTarget, isScoped ? '..' : '', version.substr(5))
// 	const dst = path.join('node_modules', parentTarget, 'node_modules', name)
// 	return util.forceSymlink(src, dst)::_finally(progress.complete)
// }

const getLinkname = (nodeModules, parentTarget, name) =>
	path.join(nodeModules, parentTarget, 'node_modules', name)

const getTarget = dst =>
	path.basename(path.dirname(dst))

const checkConflict = (name, version) => ({pkgJson}) => {
	if (!satisfies(pkgJson.version, version)) {
		throw new LocalConflictError(name, pkgJson.version, version)
	}
}

export const resolve = (nodeModules, parentTarget, name, version, isExplicit) => {
	const linkname = getLinkname(nodeModules, parentTarget, name)
	const filename = path.join(linkname, 'package.json')

	return util.readlink(linkname)
		::map(getTarget)
		::mergeMap(target =>
			util.readFile(filename, 'utf8')
				::map(JSON.parse)
				::map(pkgJson => ({parentTarget, pkgJson, target, name, fetch}))
		)
		::_do(isExplicit ? checkConflict(name, version) : Function.prototype)
}
