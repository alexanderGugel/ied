import path from 'path'
import {EmptyObservable} from 'rxjs/observable/EmptyObservable'
import {_catch} from 'rxjs/operator/catch'
import {forkJoin} from 'rxjs/observable/forkJoin'
import {map} from 'rxjs/operator/map'
import {readlink, readFile} from './util'

const getLinkname = (dir, parentTarget, name) =>
	path.join(dir, parentTarget, 'node_modules', name)

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

const readTargetPkgJson = (dir, parentTarget, name) => {
	const linkname = getLinkname(dir, parentTarget, name)
	const filename = path.join(linkname, 'package.json')

	return forkJoin(
		readTarget(linkname),
		readPkgJson(filename)
	)
}

export const resolve = (dir, parentTarget, name) =>
	readTargetPkgJson(dir, parentTarget, name)
		::map(([target, pkgJson]) => ({
			target,
			pkgJson,
			parentTarget,
			name,
			fetch
		}))
		::_catch(empty)
