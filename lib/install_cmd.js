'use strict'

var path = require('path')
var assign = require('object-assign')
var Installer = require('./Installer')

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
  var deps = argv._.length > 1
    ? readDepsFromArgv(argv)
    : readDepsFromPkgJSON(cwd, argv)

  Installer.create(cwd, function (err, installer) {
    if (err) return cb(err)

    for (var i = 0; i < deps.length; i++) {
      installer.schedule(deps[i][0], deps[i][1])
    }

    installer.on('error', cb)
    installer.on('finish', cb)
  })

  // if (argv.save) {
  //   waterfall.push(save.bind(null, cwd, 'dependencies'))
  // }

  // if (argv['save-dev']) {
  //   waterfall.push(save.bind(null, cwd, 'devDependencies'))
  // }

  // async.waterfall(waterfall, cb)
}

module.exports = installCmd
