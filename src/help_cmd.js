import path from 'path'
import {_do} from 'rxjs/operator/do'
import {readFile} from './util'

/**
 * Prints the `USAGE` document. can be invoked using `ied help` or implicitly as
 * a fall back.
 * @return {Observable} Observable sequence of `USAGE` document.
 */
export default () => {
	const filename = path.join(__dirname, '../USAGE.txt')
	return readFile(filename, 'utf8')::_do(console.log)
}
