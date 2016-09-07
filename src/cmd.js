#!/usr/bin/env node

import minimist from 'minimist'
import * as config from './config'

const alias = {
	h: 'help',
	v: 'version',
	S: 'save',
	D: 'save-dev',
	O: 'save-optional',
	r: 'registry',
	b: 'build',
	prod: 'production'
}

const string = [
	'registry'
]

const boolean = [
	'help',
	'version',
	'save',
	'save-dev',
	'save-optional',
	'build',
	'production'
]

const cwd = process.cwd()

const argv = minimist(process.argv.slice(2), {
	alias,
	string,
	boolean
})

if (argv.registry) {
	config.registry = argv.registry
}

let installCmd
let shellCmd
let runCmd
let pingCmd
let configCmd
let initCmd
let linkCmd
let unlinkCmd
let helpCmd
let versionCmd
let cacheCmd

if (argv.help) {
	helpCmd = require('./help_cmd').default
	helpCmd().subscribe()
} else if (argv.version) {
	versionCmd = require('./version_cmd').default
	versionCmd().subscribe()
} else {
	const [subCommand] = argv._

	switch (subCommand) {
		case 'i':
		case 'install':
			installCmd = require('./install_cmd').default(config)
			installCmd(cwd, argv).subscribe()
			break

		case 'sh':
		case 'shell':
			shellCmd = require('./shell_cmd').default(config)
			shellCmd(cwd).subscribe()
			break

		case 'r':
		case 'run':
		case 'run-script':
			runCmd = require('./run_cmd').default
			runCmd(cwd, argv).subscribe()
			break

		case 't':
		case 'test':
		case 'start':
		case 'build':
		case 'stop':
			runCmd = require('./run_cmd').default
			runCmd(cwd, {...argv, _: ['run'].concat(argv._)}).subscribe()
			break

		case 'ping':
			pingCmd = require('./ping_cmd').default(config)
			pingCmd().subscribe()
			break

		case 'conf':
		case 'config':
			configCmd = require('./config_cmd').default(config)
			configCmd()
			break

		case 'init':
			initCmd = require('./init_cmd').default(config)
			initCmd(cwd, argv).subscribe()
			break

		case 'link':
			linkCmd = require('./link_cmd').default(config)
			linkCmd(cwd, argv).subscribe()
			break

		case 'unlink':
			unlinkCmd = require('./unlink_cmd').default
			unlinkCmd(cwd, argv).subscribe()
			break

		case 'cache':
			cacheCmd = require('./cache_cmd').default(config)
			cacheCmd(cwd, argv)
			break

		case 'version':
			versionCmd = require('./version_cmd').default
			versionCmd().subscribe()
			break

		default:
			helpCmd = require('./help_cmd').default
			helpCmd().subscribe()
	}
}

