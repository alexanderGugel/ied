#!/usr/bin/env node

import minimist from 'minimist'
import * as config from './config'

const cwd = process.cwd()
const argv = minimist(process.argv.slice(2), {
  alias: {
    h: 'help',
    v: 'version',
    S: 'save',
    D: 'save-dev',
    o: 'only',
    r: 'registry',
    b: 'build',
    d: 'debug'
  }
})

if (argv.registry) {
  config.registry = argv.registry
}

// This doesn't have to be an IIFE, since Node wraps everything in a function
// anyways, but standard doesn't like return statements here.
(() => {
  let installCmd
  let shellCmd
  let runCmd
  let lsCmd
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
    return helpCmd()
  }

  if (argv.version) {
    versionCmd = require('./version_cmd').default
    return versionCmd()
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
      runCmd(cwd, argv)
      break
    case 't':
    case 'test':
    case 'start':
    case 'build':
    case 'stop':
      runCmd = require('./run_cmd').default
      const _argv = Object.create(argv)
      _argv._ = ['run'].concat(argv._)
      runCmd(cwd, _argv)
      break
    case 'ls':
      lsCmd = require('./ls_cmd').default
      lsCmd(cwd)
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
      linkCmd(cwd, argv)
      break
    case 'unlink':
      unlinkCmd = require('./unlink_cmd').default
      unlinkCmd(cwd, argv)
      break
    case 'cache':
      cacheCmd = require('./cache_cmd').default
      cacheCmd(cwd, argv)
      break
    case 'version':
      versionCmd = require('./version_cmd').default
      versionCmd()
      break
    default:
      helpCmd = require('./help_cmd').default
      helpCmd()
  }
})()
