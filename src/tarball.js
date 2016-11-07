import url from 'url'
import {EmptyObservable} from 'rxjs/observable/EmptyObservable'
import {download} from './fetch'
import {mergeMap} from 'rxjs/operator/mergeMap'

const supportedProtocols = {
	'http:': true,
	'https:': true
}

export default (nodeModules, pId, name, version, options) => {
	// When invoked via CLI, the top-level dependency won't have a version
	// associated with it. In that case, we should use the name as url.
	const source = version || name

	const {protocol} = url.parse(source)
	if (!supportedProtocols[protocol]) {
		return EmptyObservable.create()
	}

	return download(version)
		::mergeMap(where => {
			console.log('>>>', where)
		})
}

// match(name, version, options)::map(pkgJson => ({
// 	pId,
// 	pkgJson,
// 	id: pkgJson.dist.shasum,
// 	name,
// 	fetch
// }))
