import path from 'path'
import {ArrayObservable} from 'rxjs/observable/ArrayObservable'
import {concatStatic} from 'rxjs/operator/concat'
import {linkFromGlobal, linkToGlobal} from './link'
import {mergeMap} from 'rxjs/operator/mergeMap'
import {mkdirp} from './util'

/**
 * Can be used in two ways:
 * 1. in order to globally _expose_ the current package (`ied link`).
 * 2. in order to use a previously globally _exposed_ package (`ied link tap`).
 *
 * Useful for local development when you want to use a dependency in a
 * different project without publishing to the npm registry / installing from
 * local FS.
 *
 * Creates a symlink either in the global `node_modules` directory (`ied link`)
 * or in the project's `node_modules` directory (e.g. `ied link tap` would
 * create a symlink in `current-project/node_modules/tap` pointing to a
 * globally installed tap version).
 *
 * @param  {string} cwd - Current working directory.
 * @param  {Object} argv - Parsed command line arguments.
 * @return {Observable} Observable sequence.
 */
export default config => (cwd, argv) => {
	const names = argv._.slice(1)

	if (names.length) {
		const localNodeModules = path.join(cwd, 'node_modules')
		const init = mkdirp(localNodeModules)
		return concatStatic(init, ArrayObservable.create(names)
			::mergeMap(name => linkFromGlobal(cwd, name)))
	}

	const init = concatStatic(
		mkdirp(config.globalNodeModules),
		mkdirp(config.globalBin))
	return concatStatic(init, linkToGlobal(cwd))
}
