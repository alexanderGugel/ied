import path from 'path'
import * as config from './config'
import {ArrayObservable} from 'rxjs/observable/ArrayObservable'
import {readFileJSON, forceSymlink, unlink} from './util'
import {mergeMap} from 'rxjs/operator/mergeMap'

/**
 * generate the symlinks to be created in order to link to passed in package.
 * @param {String} cwd - current working directory.
 * @param {Object} pkgJson - `package.json` file to be linked.
 * @return {Array.<String>} - an array of tuples representing symbolic links to be
 * created.
 */
export const getSymlinks = (cwd, pkgJson) => {
	const libSymlink = [cwd, path.join(config.globalNodeModules, pkgJson.name)]
	let bin = pkgJson.bin
	if (typeof bin === 'string') {
		bin = {}
		bin[pkgJson.name] = pkgJson.bin
	}
	bin = bin || {}
	const binSymlinks = Object.keys(bin).map(name => ([
		path.join(config.globalNodeModules, pkgJson.name, bin[name]),
		path.join(config.globalBin, name)
	]))
	return [libSymlink].concat(binSymlinks)
}

/*
 * globally expose the package we're currently in (used for `ied link`).
 * @param {String} cwd - current working directory.
 * @return {Observable} - observable sequence.
 */
export const linkToGlobal = cwd =>
	readFileJSON(path.join(cwd, 'package.json'))
		::mergeMap((pkgJson) => getSymlinks(cwd, pkgJson))
		::mergeMap(([src, dst]) => forceSymlink(src, dst))

/**
 * links a globally linked package into the package present in the current
 * working directory (used for `ied link some-package`).
 * the package can be `require`d afterwards.
 * `node_modules/.bin` stays untouched.
 * @param {String} cwd - current working directory.
 * @param {String} name - name of the dependency to be linked.
 * @return {Observable} - observable sequence.
 */
export const linkFromGlobal = (cwd, name) => {
	const dst = path.join(cwd, 'node_modules', name)
	const src = path.join(config.globalNodeModules, name)
	return forceSymlink(src, dst)
}

/**
 * revert the effects of `ied link` by removing the previously created
 * symbolic links (used for `ied unlink`).
 * @param {String} cwd - current working directory.
 * @return {Observable} - observable sequence.
 */
export const unlinkToGlobal = cwd => {
	const pkg = require(path.join(cwd, 'package.json'))
	const symlinks = getSymlinks(cwd, pkg)
	return ArrayObservable.create(symlinks)
		::mergeMap(([src, dst]) => unlink(dst))
}

/**
 * revert the effects of `ied link some-package` by removing the previously
 * created symbolic links from the project's `node_modules` directory (used for
 * `ied unlink some-package`).
 * @param {String} cwd - current working directory.
 * @param {String} name - name of the dependency to be unlinked from the
 * project's `node_modules`.
 * @return {Observable} - observable sequence.
 */
export const unlinkFromGlobal = (cwd, name) => {
	const dst = path.join(cwd, 'node_modules', name)
	return unlink(dst)
}
