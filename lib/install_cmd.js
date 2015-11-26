'use strict'

var path = require('path')
var async = require('async')
var assign = require('object-assign')
var mkdirp = require('mkdirp')
var expose = require('./expose')
var config = require('./config')
var install = require('./install')
var save = require('./save')
var EventEmitter = require('events').EventEmitter

function installCmd (cwd, argv) {
  var deps

  if (argv._.length > 1) {

    // Use supplied dependencies if available.
    deps = argv._.slice(1).map(function (target) {
      var nameVersion = /^(@?.+?)(?:@(.+)?)?$/.exec(target)
      return [ nameVersion[1], nameVersion[2] || '*' ]
    })

  } else {

    // Read dependencies from package.json when no specific targets are
    // supplied.
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
    var depsObj = onlyDeps || assign({}, pkg.dependencies, pkg.devDependencies)
    deps = Object.keys(depsObj).map(function (name) {
      return [ name, depsObj[name] ]
    })

  }

  var node_modules = path.join(cwd, 'node_modules')

  async.series([
    mkdirp.bind(null, path.join(node_modules, '.bin')),
    mkdirp.bind(null, path.join(config.cacheDir, '.tmp')),
    function () {
      var bus = new EventEmitter()
      var cache = Object.create(null)

      deps.forEach(function (dep) {
        install(bus, cache, node_modules, dep[0], dep[1])
      })
    }
  ])


  // async.series([
  //   mkdirp.bind(null, path.join(cwd, 'node_modules', '.bin')),
  //   mkdirp.bind(null, path.join(config.cacheDir, '.tmp')),
  //   function () {
  //     var installAll = async.map.bind(null, deps, function (target, cb) {
  //       var name = target[0]
  //       var version = target[1]
  //       install(node_modules, name, version, function (err, pkg) {
  //         cb(err && err.code === 'LOCKED' ? null : err, pkg)
  //       })
  //     })

  //     var exposeAll = expose.bind(null, node_modules)
  //     var waterfall = [ installAll, exposeAll ]

  //     if (argv.save) {
  //       waterfall.push(save.bind(null, cwd, 'dependencies'))
  //     }

  //     if (argv['save-dev']) {
  //       waterfall.push(save.bind(null, cwd, 'devDependencies'))
  //     }

  //     async.waterfall(waterfall, function (err) {
  //       if (err) throw err
  //     })
  //   }
  // ])
}

module.exports = installCmd
