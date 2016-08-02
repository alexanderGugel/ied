import path from 'path'
import {map} from 'rxjs/operator/map'
import {mergeStatic} from 'rxjs/operator/merge'
import {reduce} from 'rxjs/operator/reduce'
import * as config from './config'
import * as registry from './registry'

import * as util from './util'

export const localStrategy = {
	resolve (pDir, name, version) {
		const linkname = path.join(pDir, '../node_modules', name)
		const filename = path.join(pDir, '../node_modules', name, 'package.json')

		const nodeModules$ = util.readlink(linkname)
			::map((link) => ({dir: path.resolve(pDir, '../node_modules', link, '..')}))

		const pkgJson$ = util.readFileJSON(filename)
			::map((pkgJson) => ({pkgJson}))

		return mergeStatic(nodeModules$, pkgJson$)::reduce(
			(result, x) => ({...result, ...x}),
			{name, version, pDir}
		)
	}
}

export const registryStrategy = {
	resolve (pDir, name, version) {
		const options = {...config.httpOptions, retries: config.retries}
		return registry.match(config.registry, name, version, options)
			::map((pkgJson) => {
				const dir = path.resolve(pDir, '../../node_modules', pkgJson.dist.shasum)
				return {name, version, pDir, pkgJson, dir}
			})
	}
}
