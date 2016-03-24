import {readFileJSON} from './util'
import path from 'path'

/**
 * display the version number.
 * @return {Subscription} - an RxJS subscription that logs the version
 * number to the console.
 */
export default function run () {
  return readFileJSON(path.join(__dirname, '../package.json'))
    .subscribe((pkgJSON) => console.log(`ied version ${pkgJSON.version}`))
}
