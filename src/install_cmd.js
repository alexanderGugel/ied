import path from 'path'
import {EmptyObservable} from 'rxjs/observable/EmptyObservable'
import {concatStatic} from 'rxjs/operator/concat'
import {publishReplay} from 'rxjs/operator/publishReplay'
import {skip} from 'rxjs/operator/skip'
import {map} from 'rxjs/operator/map'
import {_do} from 'rxjs/operator/do'

import {resolveAll, fetchAll, linkAll, initNodeModules} from './install'
import * as cache from './cache'
import {fromArgv, fromFs} from './pkg_json'
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

	const nodeModules = path.join(cwd, 'node_modules')
	const resolvedAll = updatedPkgJSONs
		::map((pkgJson) => ({ pkgJson, target: '..' }))
		::resolveAll(nodeModules)::skip(1)
		::publishReplay().refCount()

	const linkedAll = resolvedAll::linkAll(nodeModules)
	const fetchedAll = resolvedAll::fetchAll(nodeModules)
	const builtAll = argv.build ? resolvedAll::buildAll() : EmptyObservable.create()

	const initialized = concatStatic(cache.init(), initNodeModules(cwd))
	return concatStatic(initialized, fetchedAll, builtAll).subscribe()
}
