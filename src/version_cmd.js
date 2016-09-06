import path from 'path'
import {_do} from 'rxjs/operator/do'
import {map} from 'rxjs/operator/map'
import {readFileJSON} from './util'

/**
 * display the version number.
 * @return {Subscription} - a subscription that logs the versio number to the
 * console.
 */
export default () =>
	readFileJSON(path.join(__dirname, '../package.json'))
		::map(({version}) => version)
		::_do(version => console.log(`ied version ${version}`))
