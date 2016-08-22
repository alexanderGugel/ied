import path from 'path'
import {EmptyObservable} from 'rxjs/observable/EmptyObservable'
import {concatStatic} from 'rxjs/operator/concat'
import {publishReplay} from 'rxjs/operator/publishReplay'
import {skip} from 'rxjs/operator/skip'
import {map} from 'rxjs/operator/map'
import {mergeStatic} from 'rxjs/operator/merge'
import {ignoreElements} from 'rxjs/operator/ignoreElements'

import {resolveAll, fetchAll, linkAll} from './install'
import {init as initCache} from './cache'
import {fromArgv, fromFs, save} from './pkg_json'
import {buildAll} from './build'

/**
 * run the installation command.
 * @param  {String} cwd - current working directory (absolute path).
 * @param  {Object} argv - parsed command line arguments.
 * @return {Observable} - an observable sequence that will be completed once
 * the installation is complete.
 */
export default function installCmd (cwd, argv) {
	const isExplicit = argv._.length - 1
	const updatedPkgJSONs = isExplicit ? fromArgv(cwd, argv) : fromFs(cwd)
	const isProd = argv.production

	const nodeModules = path.join(cwd, 'node_modules')

	const resolvedAll = updatedPkgJSONs
		::map((pkgJson) => ({pkgJson, target: '..', isProd, isExplicit}))
		::resolveAll(nodeModules)::skip(1)
		::publishReplay().refCount()

	const initialized = initCache()::ignoreElements()
	const installedAll = mergeStatic(
		resolvedAll::linkAll(),
		resolvedAll::fetchAll(nodeModules)
	)

	const builtAll = argv.build
		? resolvedAll.lift(buildAll(nodeModules))
		: EmptyObservable.create()

	const shouldSave = argv.save || argv['save-dev'] || argv['save-optional']
	const saved = shouldSave
		? updatedPkgJSONs::save(cwd)
		: EmptyObservable.create()

	return concatStatic(
		initialized,
		installedAll,
		saved,
		builtAll
	)
}
