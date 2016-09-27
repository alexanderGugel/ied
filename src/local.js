import path from 'path'
import {EmptyObservable} from 'rxjs/observable/EmptyObservable'
import {_catch} from 'rxjs/operator/catch'
import {forkJoin} from 'rxjs/observable/forkJoin'
import {map} from 'rxjs/operator/map'
import {readlink, readFile} from './util'

const getLinkname = (dir, pId, name) =>
	path.join(dir, pId, 'node_modules', name)

const getDir = dst =>
	path.basename(path.dirname(dst))

const readTarget = linkname =>
	readlink(linkname)::map(getDir)

const readPkgJson = filename =>
	readFile(filename)::map(JSON.parse)

const empty = () =>
	EmptyObservable.create()

// EmptyObservable accepts a scheduler, but fetch is invoked with the
// node_modules path, which means we can't alias fetch to the
// EmptyObservable.create.
const fetch = empty

const readTargetPkgJson = (dir, pId, name) => {
	const linkname = getLinkname(dir, pId, name)
	const filename = path.join(linkname, 'package.json')

	return forkJoin(
		readTarget(linkname),
		readPkgJson(filename)
	)
}

export default (dir, pId, name) =>
	readTargetPkgJson(dir, pId, name)
		::map(([id, pkgJson]) => ({
			id,
			pkgJson,
			pId,
			name,
			fetch
		}))
		::_catch(empty)
