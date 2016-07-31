import path from 'path'
import {EmptyObservable} from 'rxjs/observable/EmptyObservable'
import {map} from 'rxjs/operator/map'
import {_do} from 'rxjs/operator/do'
import {mergeStatic} from 'rxjs/operator/merge'
import {reduce} from 'rxjs/operator/reduce'

import * as util from './util'

export const localStrategy = {
	fetch () {
		return EmptyObservable.create()
	},
	resolve (nodeModules, name, version) {
		const linkname = path.join(nodeModules, name)
		const filename = path.join(linkname, 'package.json')
		const acc = {name, version, nodeModules, fetch: localStrategy.fetch}

		const target$ = util.readlink(linkname)
			::map((abs) => ({target: path.basename(path.dirname(abs))}))

		const pkgJson$ = util.readFileJSON(filename)
			::map((pkgJson) => ({pkgJson}))

		return mergeStatic(target$, pkgJson$)
			::reduce((result, x) => ({...result, ...x}), acc)
	}
}

export const registryStrategy = {
	fetch () {
	},
	resolve () {
	}
}

export function resolveLocal () {
	return localStrategy.resolve.apply(this, arguments)
}
