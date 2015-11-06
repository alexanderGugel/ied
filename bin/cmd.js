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

var dir = process.cwd()
var argv = minimist(process.argv.slice(2), {
  alias: {
    h: 'help'
  }
})

function handleErr (err) {
  if (err) console.error(err)
}

function installCmd () {
  var deps = argv._.slice(1)

  if (!deps.length) {
    // Read dependencies from package.json when no specific targets are supplied.
    var pkg = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
    )
    deps = assign({}, pkg.dependencies, pkg.devDependencies)
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

  var node_modules = path.join(dir, 'node_modules')

  init(dir, function (err) {
    handleErr(err)

    var _locks = Object.create(null)

    var installAll = async.map.bind(null, deps, function (target, cb) {
      var name = target[0]
      var version = target[1]
      install(node_modules, name, version, _locks, cb)
    })

    var exposeAll = function (pkgs, cb) {
      async.map(pkgs, function (pkg, cb) {
        expose(node_modules, pkg, cb)
      }, cb)
    }

    async.waterfall([ installAll, exposeAll ], handleErr)
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
