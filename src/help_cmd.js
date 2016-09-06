import path from 'path'
import {_do} from 'rxjs/operator/do'
import {readFile} from './util'

/**
 * print the `USAGE` document. can be invoked using `ied help` or implicitly as
 * a fall back.
 * @return {Observable} - observable sequence of `USAGE`.
 */
export default () => {
	const filename = path.join(__dirname, '../USAGE.txt')
	return readFile(filename, 'utf8')::_do(console.log)
}
