import {map} from 'rxjs/operator/map'
import {mergeMap} from 'rxjs/operator/mergeMap'

import path from 'path'

import {forceSymlink, resolveSymlink} from './util'
import {normalizeBin} from './pkg_json'

const getBinLinks = (dir, pId, id, pkgJson) => {
	const binLinks = []
	const bin = normalizeBin(pkgJson)
	const names = Object.keys(bin)
	for (let i = 0; i < names.length; i++) {
		const name = names[i]
		const src = path.join(dir, id, 'package', bin[name])
		const dst = path.join(dir, pId, 'node_modules', '.bin', name)
		binLinks[i] = [src, dst]
	}
	return binLinks
}

const getDirectLink = (dir, pId, id, name) =>
	[
		path.join(dir, id, 'pkg'),
		path.join(dir, pId, 'node_modules', name)
	]

/**
 * symlink the intermediate results of the underlying observable sequence
 * @return {Observable} - empty observable sequence that will be completed
 * once all dependencies have been symlinked.
 */
export default function (dir) {
	return this
		::mergeMap(({pId, id, name, pkgJson}) => [
			getDirectLink(dir, pId, id, name),
			...getBinLinks(dir, pId, id, pkgJson)
		])
		::map(([src, dst]) => resolveSymlink(src, dst))
		::mergeMap(([src, dst]) => forceSymlink(src, dst, 'dir'))
}
