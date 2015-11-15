'use strict'

var fs = require('fs')
var async = require('async')
var path = require('path')
var mkdirp = require('mkdirp')
var assign = require('object-assign')
var util = require('util')
var debug = util.debuglog('install')
var uuid = require('node-uuid')
var forceSymlink = require('./force_symlink')
var resolve = require('./resolve')
var fetch = require('./fetch')
var config = require('./config')

var locks = Object.create(null)

// Some packages (such as `babel-runtime`), require files from their own
// package via `require('my_package/index.js')` instead of
// `require('./index.js')`.
function linkSelf (tmpDest, pkg, cb) {
  var srcPath = path.join('..', '..', pkg.dist.shasum, 'package')
  var dstPath = path.join(tmpDest, 'node_modules', pkg.name)
  forceSymlink(srcPath, dstPath, cb)
}

// Installs sub-dependencies in parallel. The trick here is to start this step
// before the fetch of the initial "direct" dependency via "fetchDep" has
// been completed.
function installSubDeps (tmpDest, dir, pkg, cb) {
  // `peerDependencies` can be treated **exactly** like regular dependencies,
  // since identical dependencies will **always** be shared.
  var subDependencies = assign({}, pkg.dependencies, pkg.peerDependencies)
  async.forEachOf(subDependencies, function (version, name, cb) {
    install(dir, name, version, function (err, dep) {
      if (err) return cb(err)
      var srcPath = path.join('..', '..', dep.dist.shasum, 'package')
      var dstPath = path.join(tmpDest, 'node_modules', dep.name)
      forceSymlink(srcPath, dstPath, cb)
    })
  }, cb)
}

// Starts installation process. This includes the installation of
// sub-dependencies and symlinking of dependencies.
// The installation process consists of the following steps:
//
// 1. Download of the **dependency** itself.
// 2. Initialization of node_modules directory.
// 3. Symlinking of the dependency itself.
// 4. Installation of sub-dependencies.
function installAtomic (dir, tmpDest, finalDest, pkg, cb) {
  async.parallel([
    fetch.bind(null, tmpDest, pkg.dist.tarball, pkg.dist.shasum),
    async.series.bind(null, [
      // Creates node_modules directory. Required before installation of
      // sub-dependencies.
      mkdirp.bind(null, path.join(tmpDest, 'node_modules')),
      linkSelf.bind(null, tmpDest, pkg),
      installSubDeps.bind(null, tmpDest, dir, pkg)
    ])
  ], cb)
}

// Installs the supplied package including all its sub-dependencies into the
// final directory. Ensures the dependency isn't installed already.
function handleResolvedPkg (dir, pkg, cb) {
  // We need the shasum in order to determine the final directory of the
  // package.
  var finalDest = path.join(dir, pkg.dist.shasum)
  var tmpDest = path.join(config.tmpDir, uuid())

  if (locks[finalDest]) {
    debug('%s is locked', finalDest)
    return cb(null, pkg)
  }
  locks[finalDest] = true

  // Ensure that the dependency hasn't been installed already.
  fs.stat(finalDest, function (err) {
    if (!err || err.code !== 'ENOENT') return cb(err, pkg)
    async.series([
      installAtomic.bind(null, dir, tmpDest, finalDest, pkg),

      // Completes the installation. This step needs to be "as atomic as
      // possible" to ensure that our node_modules is always consistent on a
      // package-by-package basis.
      function (cb) {
        debug('atomic installation of %s completed: %s -> %s', pkg.dist.shasum, tmpDest, finalDest)
        fs.rename(tmpDest, finalDest, cb)
      }
    ], function (err) {
      cb(err, pkg)
    })
  })
}

// The main entry point into the installation process. Installs a dependency
// specified by name and a semver-compatible version string into the supplied
// directory.
function install (dir, name, version, cb) {
  cb = cb || function () {}

  debug('installing %s@%s into %s', name, version, dir)

  async.waterfall([
    resolve.bind(null, name, version),
    handleResolvedPkg.bind(null, dir)
  ], cb)
}

module.exports = install
