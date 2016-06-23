import path from 'path'
import * as config from './config'
import {spawn} from 'child_process'

/**
 * enter a new session that has access to the CLIs exposed by the installed
 * packages by using an amended `PATH`.
 * @param {String} cwd - current working directory.
 */
export default function shellCmd (cwd) {
	const env = Object.create(process.env)
	env.PATH = [
		path.join(cwd, 'node_modules/.bin'), process.env.PATH
	].join(path.delimiter)

	spawn(config.sh, [], {
		stdio: 'inherit',
		env
	})
}
