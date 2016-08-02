import path from 'path'
import {map} from 'rxjs/operator/map'
import {mergeStatic} from 'rxjs/operator/merge'
import {reduce} from 'rxjs/operator/reduce'
import * as config from './config'
import * as registry from './registry'

import * as util from './util'

export function NotFoundError (baseDir, pId, name, version) {
	this.name = 'NotFoundError'
	this.path = path.join(baseDir, pId, 'node_modules', name)
	this.version = version
	this.message = `${this.path}@${this.version} not found`
	Error.captureStackTrace(this, this.constructor)
}

export const localStrategy = {
	resolve (baseDir, pId, name) {
		const linkname = path.join(baseDir, pId, 'node_modules', name)
		const filename = path.join(linkname, 'package.json')

		const nodeModules$ = util.readlink(linkname)
			::map((link) => ({id: path.basename(path.dirname(link))}))

		const pkgJson$ = util.readFileJSON(filename)
			::map((pkgJson) => ({pkgJson}))

		return mergeStatic(nodeModules$, pkgJson$)
			::reduce((result, x) => ({...result, ...x}), {})
	}
}

export const registryStrategy = {
	resolve (baseDir, pId, name, version) {
		const options = {...config.httpOptions, retries: config.retries}
		return registry.match(config.registry, name, version, options)
			::map((pkgJson) => ({pkgJson, id: pkgJson.dist.shasum}))
	}
}
