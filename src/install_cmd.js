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

	const dir = path.join(cwd, 'x/x')

	const resolvedAll = updatedPkgJSONs
		::map((pkgJson) => ({pkgJson, dir, isEntry: true, isProd}))
		::resolveAll()::skip(1)
		::publishReplay().refCount()
	const linkedAll = resolvedAll
		::linkAll()

	return linkedAll

	// const initialized = initCache()::ignoreElements()

	// const fetchedAll = resolvedAll::fetchAll()
	// const installedAll = mergeStatic(linkedAll)
	// // const installedAll = mergeStatic(linkedAll, fetchedAll)

	// const builtAll = argv.build
	// 	? resolvedAll::buildAll()
	// 	: EmptyObservable.create()

	// const saved = (argv.save || argv['save-dev'] || argv['save-optional'])
	// 	? updatedPkgJSONs::save(cwd)
	// 	: EmptyObservable.create()

	// return concatStatic(initialized, installedAll, saved, builtAll)
}
