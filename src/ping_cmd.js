import {_do} from 'rxjs/operator/do'
import {ping} from './ping'

/**
 * Pings the registry and print the received response.
 * @param  {Object} config - Config object.
 * @param  {Object} config.registry - CommonJS registry to be pinged.
 * @return {Observable} Observable sequence of the registry's response.
 */
export default ({registry}) =>
	ping(registry)::_do(console.log)
