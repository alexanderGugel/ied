import path from 'path'
import {_do} from 'rxjs/operator/do'
import {map} from 'rxjs/operator/map'
import {readdir} from './util'
import {spawn} from 'child_process'

/**
 * Enters a new session that has access to the CLIs exposed by the installed
 * packages by using an amended `PATH`.
 * @param  {Object} config - Config object.
 * @param  {Object} config.sh - Command used for spawning new sub-shell session.
 * @param  {string} cwd - Current working directory.
 * @return {Observable} Observable sequence wrapping the result of the output of
 *     the spawned child process.
 */
export default (config, cwd) => {
	const binPath = path.join(cwd, 'node_modules/.bin')
	const env = {
		...process.env,
		PATH: [binPath, process.env.PATH].join(path.delimiter)
	}
	const options = {
		stdio: 'inherit',
		env
	}

	return readdir(binPath)
		::_do(cmds => console.log('added: \n\t', cmds.join('\n\t')))
		::map(() => spawn(config.sh, [], options))
}
