#!/usr/bin/env node

'use strict'

var install = require('../lib/install')
var minimist = require('minimist')
var commands = require('../lib/commands')

var argv = minimist(process.argv.slice(2), {
  alias: {
    h: 'help',
    S: 'save',
    D: 'save-dev',
    o: 'only'
  }
})

if (argv.help) {
  return commands.helpCmd(argv)
}

switch (argv._[0]) {
  case 'i':
  case 'install':
    commands.installCmd(argv)
    break
  case 'sh':
  case 'shell':
    commands.shellCmd(argv)
    break
  case 'r':
  case 'run':
  case 'run-script':
    commands.runCmd(argv)
    break
  case 'ping':
    commands.pingCmd(argv)
    break
  default:
    commands.helpCmd(argv)
}
