#!/usr/bin/env node

'use strict'

var path = require('path')
var fs = require('fs')
var async = require('async')
var install = require('../lib/install')
var init = require('../lib/init')
var expose = require('../lib/expose')
var assign = require('object-assign')
var minimist = require('minimist')
var save = require('../lib/save')

var dir = process.cwd()
var argv = minimist(process.argv.slice(2), {
  alias: {
    h: 'help',
    S: 'save',
    D: 'save-dev',
    o: 'only'
  }
})

function handleErr (err) {
  if (err) console.error(err, err.stack)
}

function installCmd () {
  var node_modules = path.join(dir, 'node_modules')
  var deps = argv._.slice(1)

  if (!deps.length) {
    // Read dependencies from package.json when no specific targets are supplied.
    try {    
      var pkg = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
      )
    } catch (e) {
      console.error('Failed to read in package.json')
      throw e
    }
    var onlyDeps
    if (argv.only) {
      var field = ({
        'prod': 'dependencies',
        'production': 'dependencies',
        'dev': 'devDependencies',
        'development': 'devDependencies'
      })[argv.only] || argv.only
      onlyDeps = pkg[field] || {}
    }
    deps = onlyDeps || assign({}, pkg.dependencies, pkg.devDependencies)
    deps = Object.keys(deps).map(function (name) {
      return [ name, deps[name] ]
    })
  } else {
    // Use supplied dependencies if available.
    deps = deps.map(function (target) {
      target = target.split('@')
      return [ target[0], target[1] || '*' ]
    })
  }

  init(dir, function (err) {
    handleErr(err)

    var _locks = Object.create(null)

    var installAll = async.map.bind(null, deps, function (target, cb) {
      var name = target[0]
      var version = target[1]
      install(node_modules, name, version, _locks, cb)
    })

    var exposeAll = expose.bind(null, node_modules)
    var waterfall = [ installAll, exposeAll ]

    if (argv.save) {
      waterfall.push(save.bind(null, dir, 'dependencies'))
    }
    
    if (argv['save-dev']) {
      waterfall.push(save.bind(null, dir, 'devDependencies'))
    }

    async.waterfall(waterfall, handleErr)
  })
}

function helpCmd () {
  fs.createReadStream(path.join(__dirname, 'USAGE.txt')).pipe(process.stdout)
}

if (argv.help) {
  return helpCmd()
}

switch (argv._[0]) {
  case 'i':
  case 'install':
    installCmd(argv)
    break
  default:
    helpCmd(argv)
}
