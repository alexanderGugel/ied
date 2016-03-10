'use strict'

var path = require('path')
var async = require('async')
var assign = require('object-assign')
var expose = require('./expose')
var install = require('./install')
var save = require('./save')
var cache = require('./cache')

function readDepsFromPkgJSON (cwd, argv) {
  var pkg = require(path.join(cwd, 'package.json'))
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
  var deps = onlyDeps || assign({}, pkg.dependencies, pkg.devDependencies)
  var depPairs = Object.keys(deps).map(function (name) {
    return [ name, deps[name] ]
  })
  return depPairs
}

function readDepsFromArgv (argv) {
  return argv._.slice(1).map(function (target) {
    var nameVersion = /^(@?.+?)(?:@(.+)?)?$/.exec(target)
    return [ nameVersion[1], nameVersion[2] || '*' ]
  })
}

function installCmd (cwd, argv, cb) {
  var node_modules = path.join(cwd, 'node_modules')

  var deps = argv._.length > 1
    ? readDepsFromArgv(argv)
    : readDepsFromPkgJSON(cwd, argv)

  var installAll = async.map.bind(null, deps, function (target, cb) {
    var name = target[0]
    var version = target[1]
    install(node_modules, name, version, function (err, pkg) {
      cb(err && err.code === 'LOCKED' ? null : err, pkg)
    })
  })

  var exposeAll = expose.bind(null, node_modules)
  var waterfall = [ cache.init, installAll, exposeAll ]

  if (argv.save) {
    waterfall.push(save.bind(null, cwd, 'dependencies'))
  }

  if (argv['save-dev']) {
    waterfall.push(save.bind(null, cwd, 'devDependencies'))
  }

  async.waterfall(waterfall, cb)
}

module.exports = installCmd
