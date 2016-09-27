import path from 'path'

import {EmptyObservable} from 'rxjs/observable/EmptyObservable'
import {concatStatic} from 'rxjs/operator/concat'
import {map} from 'rxjs/operator/map'
import {mergeStatic} from 'rxjs/operator/merge'
import {publishReplay} from 'rxjs/operator/publishReplay'
import {skip} from 'rxjs/operator/skip'

import buildAll from './build_all'
import fetchAll from './fetch_all'
import linkAll from './link_all'
import resolveAll from './resolve_all'
import {fromArgv, fromFs, save} from './pkg_json'
import {init as initCache} from './cache'

/**
 * Installs all the dependencies and optionally tuns the individual (build)
 * lifecycle scripts.
 * @param  {string} dir - Directory in which `ied` is running.
 * @param  {boolean} shouldBuild - If the dependencies should be build.
 * @return {Observable} Empty observable sequence.
 */
function installAll (dir, shouldBuild) {
	return concatStatic(
		mergeStatic(
			this::linkAll(),
			this::fetchAll(dir)
		),
		shouldBuild
			? this::buildAll(dir)
			: EmptyObservable.create()
	)
}

/**
 * Parse the command line arguments.
 * @param  {Array.<string>} options._ - List of dependencies to be installed,
 *     e.g. `express browserify`,
 * @param  {boolean} options.production - If ied is running in `--production`
 *     mode.
 * @return {Object} Parsed `argv`.
 */
const parseArgv = ({_, production}) => ({
	isExplicit: !!(_.length - 1),
	isProd: production
})

/**
 * Check if the updated `package.json` file should be persisted. Useful since
 * `--save`, `--save-dev` and `--save-optional` imply that the updated file
 * should be saved.
 * @param  {Object} argv - Parsed command line arguments.
 * @return {boolean} If the updated `package.json` file should be persisted.
 */
const shouldSave = argv =>
	argv.save || argv['save-dev'] || argv['save-optional']

/**
 * Check if the dependencies should be built. lifecycle scripts are not being
 * executed by default, but require the usage of `--build` for security and
 * performance reasons.
 * @param  {Object} argv - Parsed command line arguments.
 * @return {boolean} If the respective `npm` lifecycle scripts should be
 *     executed.
 */
const shouldBuild = argv =>
	argv.build

export default (config, cwd, argv) => {
	const {isExplicit, isProd} = parseArgv(argv)
	const dir = path.join(cwd, 'node_modules')
	const id = '..'

	// Generates the "source" package.json file from which dependencies are being
	// parsed and installed.
	const srcPkgJson = isExplicit
		? fromArgv(cwd, argv)
		: fromFs(cwd)

	const savedPkgJson = shouldSave(argv)
		? srcPkgJson::save(cwd)
		: EmptyObservable.create()

	const installedAll = srcPkgJson
		::map(pkgJson => ({
			pkgJson,
			id,
			isProd,
			isExplicit
		}))
		::resolveAll(dir, config)
		::skip(1)
		::publishReplay().refCount()
		::installAll(dir, shouldBuild(argv))

	return concatStatic(
		initCache(),
		installedAll,
		savedPkgJson
	)
}
