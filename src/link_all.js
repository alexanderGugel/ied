import path from 'path'
import {forceSymlink} from './util'
import {map} from 'rxjs/operator/map'
import {mergeMap} from 'rxjs/operator/mergeMap'
import {normalizeBin} from './pkg_json'

const resolveSymlink = (src, dst) =>
	[path.relative(path.dirname(dst), src), dst]

const getBinLinks = ({pkgJson, parentTarget, target}) => {
	const binLinks = []
	const bin = normalizeBin(pkgJson)
	const names = Object.keys(bin)
	for (let i = 0; i < names.length; i++) {
		const name = names[i]
		const src = path.join('node_modules', target, 'package', bin[name])
		const dst = path.join('node_modules', parentTarget, 'node_modules', '.bin', name)
		binLinks.push([src, dst])
	}
	return binLinks
}

const getDirectLink = ({parentTarget, target, name}) => {
	const src = path.join('node_modules', target, 'package')
	const dst = path.join('node_modules', parentTarget, 'node_modules', name)
	return [src, dst]
}

export default function linkAll () {
	return this
		::mergeMap(dep => [getDirectLink(dep), ...getBinLinks(dep)])
		::map(([src, dst]) => resolveSymlink(src, dst))
		::mergeMap(([src, dst]) => forceSymlink(src, dst))
}
