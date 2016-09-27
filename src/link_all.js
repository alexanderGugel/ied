import path from 'path'
import {forceSymlink} from './util'
import {map} from 'rxjs/operator/map'
import {mergeMap} from 'rxjs/operator/mergeMap'
import {normalizeBin} from './pkg_json'

const resolveSymlink = ([src, dst]) =>
	[path.relative(path.dirname(dst), src), dst]

const getBinLinks = ({pkgJson, pId, id}) => {
	const binLinks = []
	const bin = normalizeBin(pkgJson)
	const names = Object.keys(bin)
	for (let i = 0; i < names.length; i++) {
		const name = names[i]
		const src = path.join('node_modules', id, 'package', bin[name])
		const dst = path.join('node_modules', pId, 'node_modules', '.bin', name)
		binLinks.push([src, dst])
	}
	return binLinks
}

const getDirectLink = ({pId, id, name}) => {
	const src = path.join('node_modules', id, 'package')
	const dst = path.join('node_modules', pId, 'node_modules', name)
	return [src, dst]
}

const getAllLinks = dep =>
	[getDirectLink(dep), ...getBinLinks(dep)]

const createSymlink = ([src, dst]) =>
	forceSymlink(src, dst)

export default function linkAll () {
	return this
		::mergeMap(getAllLinks)
		::map(resolveSymlink)
		::mergeMap(createSymlink)
}
