import rimraf from 'rimraf'
import path from 'path'
import * as config from './config'

export default function cacheCmd (cwd, argv) {
	switch (argv._[1]) {
		case 'clean':
			const shasum = argv._[2]
			if (shasum) {
				rimraf.sync(path.join(config.cacheDir, shasum))
			} else {
				rimraf.sync(config.cacheDir)
			}
			break
		default:
			const helpCmd = require('./help_cmd').default
			helpCmd(cwd, argv)
	}
}
