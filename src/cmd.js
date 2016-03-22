#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import minimist from 'minimist'
import config from '../lib/config'
import installCmd from '../lib/install_cmd'
import runCmd from '../lib/run_cmd'
import shellCmd from '../lib/shell_cmd'
import pingCmd from '../lib/ping_cmd'
import lsCmd from '../lib/ls_cmd'
import configCmd from '../lib/config_cmd'
import initCmd from '../lib/init_cmd'
import linkCmd from '../lib/link_cmd'
import unlinkCmd from '../lib/unlink_cmd'

function helpCmd () {
  fs.ReadStream(path.join(__dirname, 'USAGE.txt')).pipe(process.stdout)
}

function versionCmd () {
  console.log('ied version', require('../package.json').version)
}

const cwd = process.cwd()
const argv = minimist(process.argv.slice(2), {
  alias: {
    h: 'help',
    v: 'version',
    S: 'save',
    D: 'save-dev',
    o: 'only',
    r: 'registry'
  }
})

if (argv.registry) {
  config.registry = argv.registry
}

// This doesn't have to be an IIFE, since Node wraps everything in a function
// anyways, but standard doesn't like return statements here.
(() => {
  if (argv.help) {
    return helpCmd()
  }

  if (argv.version) {
    return versionCmd()
  }

  switch (argv._[0]) {
    case 'i':
    case 'install':
      installCmd(cwd, argv).subscribe()
      break
    case 'sh':
    case 'shell':
      shellCmd(cwd)
      break
    case 'r':
    case 'run':
    case 'run-script':
      runCmd(cwd, argv)
      break
    case 't':
    case 'test':
      // The test command is simple a run command that executes the test script.
      const _argv = Object.create(argv)
      _argv._ = ['run'].concat(argv._)
      runCmd(cwd, _argv)
      break
    case 'ls':
      lsCmd(cwd)
      break
    case 'ping':
      pingCmd()
      break
    case 'conf':
    case 'config':
      configCmd()
      break
    case 'init':
      initCmd(cwd, argv)
      break
    case 'link':
      linkCmd(cwd, argv)
      break
    case 'unlink':
      unlinkCmd(cwd, argv)
      break
    default:
      helpCmd()
  }
})()
