import {_do} from 'rxjs/operator/do'
import {ping} from './ping'

/**
 * ping the registry and print the received response.
 */
export default ({registry}) => () =>
	ping(registry)::_do(console.log)
