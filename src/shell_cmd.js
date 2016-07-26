import path from 'path'
import * as config from './config'
import {spawn} from 'child_process'
import {readdir} from './util'
import {map} from 'rxjs/operator/map'
import {_do} from 'rxjs/operator/do'

/**
 * enter a new session that has access to the CLIs exposed by the installed
 * packages by using an amended `PATH`.
 * @param {String} cwd - current working directory.
 */
export default function shellCmd (cwd) {
	const binPath = path.join(cwd, 'node_modules/.bin')
	const env = Object.create(process.env)
	env.PATH = [binPath, process.env.PATH].join(path.delimiter)

	return readdir(binPath)
		::_do(cmds => console.log('\nadded', cmds.join(', '), '\n'))
		::map(() => spawn(config.sh, [], {stdio: 'inherit', env}))
}
