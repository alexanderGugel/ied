import path from 'path'
import fs from 'fs'

/**
 * print the `USAGE` document. can be invoked using `ied help` or implicitly as
 * a fall back.
 */
export default function helpCmd () {
	fs.ReadStream(path.join(__dirname, '../USAGE.txt')).pipe(process.stdout)
}
