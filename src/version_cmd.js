import {readFileJSON} from './util'
import path from 'path'
import {map} from 'rxjs/operator/map'
import {_do} from 'rxjs/operator/do'

/**
 * display the version number.
 * @return {Subscription} - a subscription that logs the versio number to the
 * console.
 */
export default function versionCmd () {
	return readFileJSON(path.join(__dirname, '../package.json'))
		::map(({ version }) => version)
		::_do((version) => console.log(`ied version ${version}`))
}
