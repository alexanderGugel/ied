import path from 'path'
import {_do} from 'rxjs/operator/do'
import {map} from 'rxjs/operator/map'
import {readdir} from './util'
import {spawn} from 'child_process'

/**
 * enter a new session that has access to the CLIs exposed by the installed
 * packages by using an amended `PATH`.
 */
export default config => cwd => {
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
