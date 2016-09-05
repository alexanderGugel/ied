import path from 'path'
import {concatStatic} from 'rxjs/operator/concat'
import {map} from 'rxjs/operator/map'
import {mergeStatic} from 'rxjs/operator/merge'
import {publishReplay} from 'rxjs/operator/publishReplay'
import {skip} from 'rxjs/operator/skip'

import fetchAll from './fetch_all'
import linkAll from './link_all'
import resolveAll from './resolve_all'
import {fromArgv, fromFs} from './pkg_json'
import {init as initCache} from './cache'

function installAll (dir) {
	return mergeStatic(
		this::linkAll(),
		this::fetchAll(dir)
	)
}

const parseArgv = ({_, production}) => ({
	isExplicit: !!(_.length - 1),
	isProd: production
})

export default config => (cwd, argv) => {
	const {isExplicit, isProd} = parseArgv(argv)
	const dir = path.join(cwd, 'node_modules')
	const target = '..'

	// generate the "source" package.json file from which dependencies are being
	// parsed and installed.
	const srcPkgJson = isExplicit ? fromArgv(cwd, argv) : fromFs(cwd)

	const installedAll = srcPkgJson
		::map(pkgJson => ({
			pkgJson,
			target,
			isProd,
			isExplicit
		}))
		::resolveAll(dir, config)
		::skip(1)
		::publishReplay().refCount()
		::installAll(dir)

	return concatStatic(
		initCache(),
		installedAll
	)
}
