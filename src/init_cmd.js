import init from 'init-package-json'
import path from 'path'
import * as config from './config'

/**
 * initialize a new `package.json` file.
 * 
 * @param  {String} cwd - current working directory.
 * @see https://www.npmjs.com/package/init-package-json
 */
export default function initCmd (cwd) {
	const initFile = path.resolve(config.home, '.ied-init')

	init(cwd, initFile, (err) => {
		if (err) {
			if (err.message === 'canceled') {
				console.log('init canceled!')
				return
			}

			throw err
		}
	})
}

