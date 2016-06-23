#!/usr/bin/env node

import minimist from 'minimist'
import * as config from './config'
if (process.env.NODE_ENV === 'development') {
	require('source-map-support').install()
}

const alias = {
	h: 'help',
	v: 'version',
	S: 'save',
	D: 'save-dev',
	O: 'save-optional',
	E: 'save-exact',
	r: 'registry',
	b: 'build'
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
	'save-exact',
	'build'
]

const cwd = process.cwd()
const argv = minimist(process.argv.slice(2), {alias, string, boolean})

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

(() => {
	if (argv.help) {
		helpCmd = require('./help_cmd').default
		helpCmd().subscribe()
		return
	}

	if (argv.version) {
		versionCmd = require('./version_cmd').default
		versionCmd().subscribe()
		return
	}

	const [subCommand] = argv._

	switch (subCommand) {
		case 'i':
		case 'install':
			installCmd = require('./install_cmd').default
			installCmd(cwd, argv).subscribe()
			break
		case 'sh':
		case 'shell':
			shellCmd = require('./shell_cmd').default
			shellCmd(cwd)
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
			pingCmd = require('./ping_cmd').default
			pingCmd()
			break
		case 'conf':
		case 'config':
			configCmd = require('./config_cmd').default
			configCmd()
			break
		case 'init':
			initCmd = require('./init_cmd').default
			initCmd(cwd, argv)
			break
		case 'link':
			linkCmd = require('./link_cmd').default
			linkCmd(cwd, argv).subscribe()
			break
		case 'unlink':
			unlinkCmd = require('./unlink_cmd').default
			unlinkCmd(cwd, argv).subscribe()
			break
		case 'cache':
			cacheCmd = require('./cache_cmd').default
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
})()
