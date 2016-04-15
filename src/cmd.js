#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import yargs from 'yargs'
import ProgressBar from 'progress'
import * as config from './config'

const cwd = process.cwd()
function makeParser() {
  return yargs
  .usage('ied is a package manager for Node.\n\n' +
         'Usage:\n\n' +
         'ied <command> [arguments]')

  // must be first, otherwise install will clobber
  .command('help [command]', 'View this help, or help on an individual command')

  .command('install [packages..]', 'Fetch all packages or an individual package',
    function(yargs) {
      return yargs
      .example('$0 install')
      .example('$0 install <pkg>')
      .example('$0 install <pkg> <pkg2>')
      .example('$0 install <pkg>@<version>')
      .example('$0 install <pkg>@<version range>')

      .boolean('save')
      .alias('save', 'S')
      .describe('save', 'Update package.json dependencies')

      .boolean('save-dev')
      .alias('save-dev', 'D')
      .describe('save-dev', 'Update package.json devDependencies')

      .nargs('only', 1)
      .alias('only', 'o')
      .describe('only', 'Install a subset of dependencies')
      .example('$0 install --only=production')

      .nargs('registry', 1)
      .alias('registry', 'r')
      .describe('registry', 'Use a custom registry')
      .default('registry', 'https://registry.npmjs.org')
      .example('$0 install --registry="https://npm.mycorp.com" <pkg>')

      .boolean('build')
      .alias('b', 'build')
      .describe('build', 'Execute lifecycle scripts upon completion (e.g. postinstall)')
    }
  )

  // TODO `ied version` to list package versions,
  // and `ied version major|minor|patch` for incrementing package.json
  // .command('version', 'Get package versions')
  // TODO
  // .command('uninstall', 'Remove a package')
  .command('run <command..>', 'Run a package.json script')
  .command('run-script <command..>', false) // needed for alias to parse positional args
  .command('shell', 'Enter a sub-shell with an augmented PATH')
  .command('ping', 'Check if the registry is up')
  .command('ls', 'Print the dependency graph')
  .command('config', 'Print the current config')
  .command('init', 'Initialize a new package')
  .command('link [package]', 'Link the current package or into it')
  .command('unlink [package]', 'Unlink the current package or from it')
  .command('cache clean', 'Clean the global package cache')
  .command('start', 'runs `ied run start`')
  .command('stop', 'runs `ied run stop`')
  .command('build', 'runs `ied run build`')
  .command('test', 'runs `ied run test`')

  .boolean('verbose')
  .alias('verbose', 'v')
  .describe('verbose', 'Use verbose logging')

  .boolean('debug')
  .alias('debug', 'd')
  .describe('debug', 'Use debug logging')

  // Helper for --version
  .version()

  .help('h')
  .describe('h', 'Show usage information')
  .alias('h', 'help')

  // yargs wraps examples very strangely
  .wrap(yargs.terminalWidth())

  .epilog('README:  https://github.com/alexanderGugel/ied\n' +
          'ISSUES:  https://github.com/alexanderGugel/ied/issues')

  // Disable showing help on a bad command
  .showHelpOnFail(false, 'Unknown command. Run ied help [command]')
}

// Yargs doesn't support command alases, so we fake it ourselves.
function resolveAliases(argv) {
  // input: output
  // string: string | Array<string>
  const cmdAliases = {
    i: 'install',
    sh: 'shell',
    r: 'run',
    'run-script': 'run',
    't': {_: 'run', command: ['test']},
    'test': {_: 'run', command: ['test']},
    'start': {_: 'run', command: ['start']},
    'stop': {_: 'run', command: ['stop']},
    'build': {_: 'run', command: ['build']},
  }

  if (argv.registry) {
    config.registry = argv.registry
  }

  if (argv.verbose) {
    config.logLevel = 'verbose'
  }

  if (argv.debug) {
    config.logLevel = 'debug'
  }

  const inputCmd = argv._[0]
  const alias = cmdAliases[inputCmd]
  if (typeof alias === 'string') {
    argv._ = [].concat(alias).concat(argv._.slice(1))
  } else if (typeof alias === 'object' && alias._) {
    for (const key in alias) {
      argv[key] = alias[key]
    }
  }
  return argv
}

const argv = resolveAliases(makeParser().argv)
const cmd = argv._[0]

switch (cmd) {
  case 'install':
    let progress
    if (!config.logLevel) {
      progress = new ProgressBar(':percent    :current / :total   installing modules', { total: 1 })
    }

    const installCmd = require('./install_cmd').default;
    installCmd(cwd, argv, config.logLevel, progress).subscribe(null, null, () => {
      progress && progress.tick()
    })
    break
  case 'help':
    if (argv.command === 'install') {
      // Turn `ied help install` into `ied install --help`
      // Not easy to do with a cmdAlias so we transform it here.
      // We can't tell yargs to re-parse, so we lie to it and create a new instance.
      const parser = makeParser()
      parser.parse(`${process.argv[0]} ${argv.command} --help`)
      parser.showHelp()
    } else {
      yargs.showHelp()
    }
    break
  case 'shell':
    const shellCmd = require('./shell_cmd').default;
    shellCmd(cwd)
    break
  case 'run':
    const runCmd = require('./run_cmd').default;
    runCmd(cwd, argv)
    break
  case 'ls':
    const lsCmd = require('./ls_cmd').default;
    lsCmd(cwd)
    break
  case 'ping':
    const pingCmd = require('./ping_cmd').default;
    pingCmd()
    break
  case 'config':
    const configCmd = require('./config_cmd').default;
    configCmd()
    break
  case 'init':
    const initCmd = require('./init_cmd').default;
    initCmd(cwd, argv)
    break
  case 'link':
    const linkCmd = require('./link_cmd').default;
    linkCmd(cwd, argv)
    break
  case 'unlink':
    const unlinkCmd = require('./unlink_cmd').default;
    unlinkCmd(cwd, argv)
    break
  case 'cache':
    const cacheCmd = require('./cache_cmd').default;
    cacheCmd(cwd, argv)
    break
  case 'version':
    yargs.getUsageInstance().showVersion()
    break
  default:
    // Rather than fail on no arguments, just show the help screen like npm does.
    yargs.showHelp()
}
