import {skip} from 'rxjs/operator/skip'
import {map} from 'rxjs/operator/map'
import {mergeStatic} from 'rxjs/operator/merge'
import {publishReplay} from 'rxjs/operator/publishReplay'

import path from 'path'

import resolveAll from './resolve_all'
import fetchAll from './fetch_all'
import linkAll from './link_all'
import {fromArgv, fromFs} from './pkg_json'

const createEntryDep = ({production: isProd}) =>
	pkgJson =>
		({pkgJson, id: '..', isEntry: true, isProd})

/**
 * check if explicit dependencies have been requested. used for either reading
 * dependencies to be installed from the local `package.json` or from the
 * supplied command line arguments.
 * @param  {Object} argv - command line arguments.
 * @return {boolean} boolean value indicating if explicit dependencies have
 * been requested.
 */
const isExplitit = argv =>
	!!(argv._.length - 1)

const getPkgJson = (cwd, argv) =>
	(isExplitit(argv) ? fromArgv(cwd, argv) : fromFs(cwd))

function install (dir, config) {
	return mergeStatic(
		this::linkAll(dir, config),
		this::fetchAll(dir, config)
	)
}

export default (cwd, argv, config) => {
	const dir = path.join(cwd, 'node_modules')
	return getPkgJson(cwd, argv)
		::map(createEntryDep(argv))
		::resolveAll(dir)::skip(1)
		::publishReplay().refCount()
		::install(dir, config)
}
