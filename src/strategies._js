// import debuglog from './debuglog'
import path from 'path'
import util from './util'
import {EmptyObservable} from 'rxjs/observable/EmptyObservable'

// export function resolveLocal (nodeModules, parentTarget, name, version, isExplicit) {
// 	const linkname = path.join(nodeModules, parentTarget, 'node_modules', name)
// 	const mockFetch = () => EmptyObservable.create()
// 	log(`resolving ${linkname} from node_modules`)

// 	// support `file:` with symlinks
// 	if (version.substr(0, 5) === 'file:') {
// 		log(`resolved ${name}@${version} as local symlink`)
// 		const isScoped = name.charAt(0) === '@'
// 		const src = path.join(parentTarget, isScoped ? '..' : '', version.substr(5))
// 		const dst = path.join('node_modules', parentTarget, 'node_modules', name)
// 		return util.forceSymlink(src, dst)::_finally(progress.complete)
// 	}

// 	return util.readlink(linkname)::mergeMap((rel) => {
// 		const target = path.basename(path.dirname(rel))
// 		const filename = path.join(linkname, 'package.json')
// 		log(`reading package.json from ${filename}`)

// 		return util.readFileJSON(filename)::map((pkgJson) => {
// 			if (isExplicit && !satisfies(pkgJson.version, version)) {
// 				throw new LocalConflictError(name, pkgJson.version, version)
// 			}
// 			return {parentTarget, pkgJson, target, name, fetch: mockFetch}
// 		})
// 	})
// }

	// const {raw, name, type, spec} = parsedSpec
	// log(`resolving ${raw} from npm`)
	// const options = {...config.httpOptions, retries: config.retries}
	// return registry.match(config.registry, name, spec, options)
	// 	::_do((pkgJson) => { log(`resolved ${raw} to tarball shasum ${pkgJson.dist.shasum} from npm`) })
	// 	::map((pkgJson) => ({parentTarget, pkgJson, target: pkgJson.dist.shasum, name, type, fetch}))


export const registryStrategy = {
	fetch () {
	},
	link () {
	},
	resolve (nodeModules, name, version) {
		return registry.match(config.registry, name, spec, options)
			::map((pkgJson) => ({
				pkgJson,
				target: pkgJson.dist.shasum,
				name
				type,
				fetch
			}))
	}
}

