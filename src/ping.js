import url from 'url'
import {httpGet} from './util'
import {map} from 'rxjs/operator/map'

/**
 * ping the pre-configured npm registry by hitting `/-/ping?write=true`.
 * @param {String} registry - root registry url to ping.
 * @return {Observable} - observable sequence of the returned JSON object.
 */
export const ping = registry => {
	const uri = url.resolve(registry, '-/ping?write=true')
	return httpGet(uri)::map(({body}) => body)
}
