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

function helpCmd () {
  fs.ReadStream(path.join(__dirname, 'USAGE.txt')).pipe(process.stdout)
}

function versionCmd () {
  console.log('mpm version', require('../package.json').version)
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

if (argv.help) {
  return helpCmd()
}

if (argv.version) {
  versionCmd()
  process.exit(0)
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
  default:
    helpCmd()
}
