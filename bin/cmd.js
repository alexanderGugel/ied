#!/usr/bin/env node

var fs = require('fs')
var path = require('path')
var minimist = require('minimist')
var config = require('../lib/config')
var installCmd = require('../lib/install_cmd')
var runCmd = require('../lib/run_cmd')
var shellCmd = require('../lib/shell_cmd')
var pingCmd = require('../lib/ping_cmd')
var lsCmd = require('../lib/ls_cmd')
var exposeCmd = require('../lib/expose_cmd')
var configCmd = require('../lib/config_cmd')
var initCmd = require('../lib/init_cmd')
var linkCmd = require('../lib/link_cmd')
var unlinkCmd = require('../lib/unlink_cmd')

function helpCmd () {
  fs.ReadStream(path.join(__dirname, 'USAGE.txt')).pipe(process.stdout)
}

function versionCmd () {
  console.log('ied version', require('../package.json').version)
}

var cwd = process.cwd()
var argv = minimist(process.argv.slice(2), {
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
(function () {
  if (argv.help) {
    return helpCmd()
  }

  if (argv.version) {
    return versionCmd()
  }

  switch (argv._[0]) {
    case 'i':
    case 'install':
      installCmd(cwd, argv)
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
      var _argv = Object.create(argv)
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
    case 'expose':
    case 'ex':
      exposeCmd(cwd, argv)
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
}())
