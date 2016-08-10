import url from 'url'
import {registry} from './config'
import {httpGet} from './util'

/**
 * ping the pre-configured npm registry by hitting `/-/ping?write=true`.
 * @return {Observable} - observable sequence of the returned JSON object.
 */
export function ping () {
	const uri = url.resolve(registry, '-/ping?write=true')
	return httpGet(uri)
}
