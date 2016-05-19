import async from 'async'
import * as link from './link'
import * as config from './config'
import mkdirp from 'mkdirp'
import path from 'path'

function handleError (err) {
	if (err) throw err
}

/**
 * can be used in two ways:
 * 1. in order to globally **expose** the current package (`ied link`).
 * 2. in order to use a previously globally **exposed** package (`ied link tap`).
 *
 * useful for local development when you want to use a dependency in a
 * different project without publishing to the npm registry / installing from
 * local FS.
 *
 * create a symlink either in the global `node_modules` directory (`ied link`)
 * or in the project's `node_modules` directory (e.g. `ied link tap` would
 * create a symlink in `current-project/node_modules/tap` pointing to a
 * globally installed tap version).
 * 
 * @param  {String} cwd - current working directory.
 * @param  {Object} argv - parsed command line arguments.
 */
export default function linkCmd (cwd, argv) {
	const deps = argv._.slice(1)

	if (!deps.length) {
		async.series([
			mkdirp.bind(null, config.globalNodeModules),
			mkdirp.bind(null, config.globalBin),
			link.linkToGlobal.bind(null, cwd)
		], handleError)
	} else {
		async.series([
			mkdirp.bind(null, path.join(cwd, 'node_modules')),
			async.each.bind(null, deps, link.linkFromGlobal.bind(null, cwd))
		], handleError)
	}
}
