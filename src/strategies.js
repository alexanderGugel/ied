import path from 'path'
import {EmptyObservable} from 'rxjs/observable/EmptyObservable'
import {map} from 'rxjs/operator/map'
import {_do} from 'rxjs/operator/do'
import {_finally} from 'rxjs/operator/finally'
import {mergeStatic} from 'rxjs/operator/merge'
import {reduce} from 'rxjs/operator/reduce'

import * as util from './util'

export const localStrategy = {
	fetch () {
		return EmptyObservable.create()
	},
	resolve (_nodeModules, name, version) {
		const id = name + ': ' + version

		const linkname = path.join(_nodeModules, name)
		const filename = path.join(linkname, 'package.json')
		const acc = {name, version, fetch: localStrategy.fetch}

		const target$ = util.readlink(linkname)
			::map((target) => path.resolve(_nodeModules, target))
			::map((target) => path.join(target, '../node_modules'))
			::map((nodeModules) => ({nodeModules}))

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
