import path from 'path'
import rimraf from 'rimraf'

/**
 * print help if invoked without any further sub-command, empty the cache
 * directory (delete it) if invoked via `ied cache clean`.
 */
export default ({cacheDir}) => (cwd, argv) => {
	switch (argv._[1]) {
		// `ied cache clean`
		case 'clean':
			const shasum = argv._[2]
			if (shasum) {
				rimraf.sync(path.join(cacheDir, shasum))
			} else {
				rimraf.sync(cacheDir)
			}
			break
		// `ied cache`
		default:
			const helpCmd = require('./help_cmd').default
			helpCmd(cwd, argv).subscribe()
	}
}
