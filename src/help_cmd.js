import path from 'path'
import {readFile} from './util'
import {_do} from 'rxjs/operator/do'

/**
 * print the `USAGE` document. can be invoked using `ied help` or implicitly as
 * a fall back.
 * @return {Observable} - observable sequence of `USAGE`.
 */
export default function helpCmd () {
	const filename = path.join(__dirname, '../USAGE.txt')
	return readFile(filename, 'utf8')::_do(console.log)
}
