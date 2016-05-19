import rimraf from 'rimraf'
import path from 'path'
import * as config from './config'

/**
 * print help if invoked without any further sub-command, empty the cache
 * directory (delete it) if invoked via `ied cache clean`.
 * @param  {String} cwd - current working directory.
 * @param  {Object} argv - parsed command line arguments.
 */
export default function cacheCmd (cwd, argv) {
	switch (argv._[1]) {
		// `ied cache clean`
		case 'clean':
			const shasum = argv._[2]
			if (shasum) {
				rimraf.sync(path.join(config.cacheDir, shasum))
			} else {
				rimraf.sync(config.cacheDir)
			}
			break
		// `ied cache`
		default:
			const helpCmd = require('./help_cmd').default
			helpCmd(cwd, argv)
	}
}
