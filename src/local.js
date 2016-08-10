import path from 'path'
import {EmptyObservable} from 'rxjs/observable/EmptyObservable'
import {_finally} from 'rxjs/operator/finally'
import {map} from 'rxjs/operator/map'
import {mergeMap} from 'rxjs/operator/mergeMap'
import {satisfies} from 'semver'
import {inherits} from 'util'

import * as util from './util'
import * as progress from './progress'

// thrown when the currently installed version does not satisfy the semantic
// version constraint.
inherits(LocalConflictError, Error)
function LocalConflictError (name, version, expected) {
	Error.captureStackTrace(this, this.constructor)
	this.name = 'LocalConflictError'
	this.message = `Local version ${name}@${version} does not match required\\
version @${expected}`
	this.extra = {name, version, expected}
}

export const fetch = () => EmptyObservable.create()

export const resolve = (nodeModules, parentTarget, name, version, isExplicit) => {
	const linkname = path.join(nodeModules, parentTarget, 'node_modules', name)

	// support `file:` with symlinks
	if (version.substr(0, 5) === 'file:') {
		const isScoped = name.charAt(0) === '@'
		const src = path.join(parentTarget, isScoped ? '..' : '', version.substr(5))
		const dst = path.join('node_modules', parentTarget, 'node_modules', name)
		return util.forceSymlink(src, dst)::_finally(progress.complete)
	}

	return util.readlink(linkname)::mergeMap((rel) => {
		const target = path.basename(path.dirname(rel))
		const filename = path.join(linkname, 'package.json')

		return util.readFileJSON(filename)::map((pkgJson) => {
			if (isExplicit && !satisfies(pkgJson.version, version)) {
				throw new LocalConflictError(name, pkgJson.version, version)
			}
			return {parentTarget, pkgJson, target, name, fetch}
		})
	})
}
