#!/usr/bin/env node

var yargs = require('yargs')
var config = require('../lib/config')
var installCmd = require('../lib/install_cmd')
var runCmd = require('../lib/run_cmd')
var shellCmd = require('../lib/shell_cmd')
var pingCmd = require('../lib/ping_cmd')
var lsCmd = require('../lib/ls_cmd')
var configCmd = require('../lib/config_cmd')
var initCmd = require('../lib/init_cmd')
var linkCmd = require('../lib/link_cmd')
var unlinkCmd = require('../lib/unlink_cmd')

var cwd = process.cwd()
var argv = yargs

.usage('ied is a package manager for Node.\n\n' +
       'Usage:\n\n' +
       'ied <command> [arguments]')

.command('install [package]', 'Fetch all packages or an individual package',
  function (yargs) {
    return yargs
    .example('$0 install')
    .example('$0 install <pkg>')
    .example('$0 install <pkg>@<version>')
    .example('$0 install <pkg>@<version range>')
    .alias('S', 'save')
    .boolean('save')
    .describe('S', 'Update package.json dependencies')

    .alias('D', 'save-dev')
    .boolean('save-dev')
    .describe('D', 'Update package.json devDependencies')

    .alias('o', 'only')
    .nargs('o', 1)
    .describe('o', 'Install a subset of dependencies')
    .example('$0 install --only=production',
             'Install dependencies only, not devDependencies')

    .alias('r', 'registry')
    .nargs('r', 1)
    .describe('r', 'Use a custom registry')
    .default('r', 'https://registry.npmjs.org')
    .example('$0 install --registry="https://npm.mycorp.com" <pkg>',
             'Install a package from your local registry')
  }, function (argv) {
    // yargs doesn't handle variadic positional arguments. It will
    // put the first one in argv.package, and the rest in _.
    // This way, `ied install --save lodash underscore` will result in
    // {_: ['install', lodash', 'underscore'], save: true}
    if (argv.package) {
      argv._.splice(1, 0, argv.package)
      argv.package = null
      argv.help = false
    }
  }
)
// TODO `ied version` to list package versions,
// and `ied version major|minor|patch` for incrementing package.json
// .command('version', 'Get package versions')
// TODO
// .command('uninstall', 'Remove a package')
.command('run <command>', 'Run a package.json script')
.command('test', 'Run the test script specified in the package.json')
.command('shell', 'Enter a sub-shell with an augmented PATH')
.command('ping', 'Check if the registry is up')
.command('ls', 'Print the dependency graph')
.command('config', 'Print the current config')
.command('init', 'Initialize a new package')
.command('link [package]', 'Link the current package or into it')
.command('unlink [package]', 'Unlink the current package or from it')
// Would like to define a callback here, but `ied help install`
// seems to trigger a yargs bug where it matches the 'install' to a command
// and therefore doesn't execute the callback
.command('help [command]', 'View help on an individual command')

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

.argv

if (argv.registry) {
  config.registry = argv.registry
}

switch (argv._[0]) {
  case 'i':
  case 'install':
    installCmd(cwd, argv, function (err) {
      if (err) {
        throw err
      }
    })
    break
  case 'help':
    // Turn `ied help install` into `ied install --help`
    argv.help = true
    argv._ = argv._.slice(1)
    yargs.showHelp()
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
  case 'init':
    initCmd(cwd, argv)
    break
  case 'link':
    linkCmd(cwd, argv)
    break
  case 'unlink':
    unlinkCmd(cwd, argv)
    break
  case 'version':
    yargs.getUsageInstance().showVersion()
    break
  default:
    // Technically not needed, yargs should grab this
    yargs.showHelp()
}
