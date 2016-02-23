'use strict'

var fs = require('fs')
var async = require('async')
var path = require('path')
var mkdirp = require('mkdirp')
var assign = require('object-assign')
var debug = require('./debuglog')('install')
var uuid = require('node-uuid')
var forceSymlink = require('force-symlink')
var resolve = require('./resolve')
var fetch = require('./fetch')
var run = require('./run')
var locks = require('./locks')

// Exposes the dependency defined via pkg to the package defined via its root
// directory `dir`. Correctly handles scoped modules.
function linkPkg (dir, pkg, cb) {
  var dstPath = path.join(dir, 'node_modules', pkg.name)
  var srcPath = path.relative(
    path.join(dstPath, 'node_modules'),
    path.join(dir, 'node_modules', pkg.uid)
  )

  // path.dirname('@hello/world') #=> 'hello'
  // path.dirname('world') #=> '.'
  async.series([
    mkdirp.bind(null, path.join(dir, 'node_modules', path.dirname(pkg.name))),
    forceSymlink.bind(null, srcPath, dstPath)
  ], cb)
}

// Invoke lifecycle scripts, such as postinstall
function invokeScripts (dir, cb) {
  var pkg = require(path.join(dir, 'package.json'))
  run(dir, pkg, 'install', cb)
}

// Reads package.json file from the given directory
function readPackage (dir, cb) {
  var err = null
  var pkg
  try {
    pkg = require(path.join(dir, 'package.json'))
  } catch (e) {
    err = e
  }
  cb(err, pkg)
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
      if (err && err.code !== 'LOCKED') return cb(err)
      linkPkg(tmpDest, dep, cb)
    })
  }, cb)
}

// Starts the installation process. This includes the installation of
// sub-dependencies and symlinking of dependencies.
// The installation process consists of the following steps:
//
// 1. Download of the **dependency** itself.
// 2. Initialization of node_modules directory.
// 3. Symlinking of the dependency itself.
// 4. Installation of sub-dependencies.
function recurse (dir, tmpDest, pkg, cb) {
  debug('recursively installing %s@%s into %s from %s', pkg.name, pkg.version, tmpDest, dir)

  async.series([
    // Creates node_modules directory. Required before installation of
    // sub-dependencies. `tar-fs` uses `mkdirp` under the hood, but we can't
    // rely on it, since we install further sub-dependencies in parallel.
    mkdirp.bind(null, path.join(tmpDest, 'node_modules')),

    // Some packages (such as `babel-runtime`), require files from their own
    // package via `require('my_package/index.js')` instead of for example
    // `require('./index.js')`.
    linkPkg.bind(null, tmpDest, pkg),

    async.waterfall.bind(null, [
      fetch.bind(null, tmpDest, pkg.tarball, pkg.uid, pkg.shasum),

      // Read dependency information
      readPackage.bind(null, tmpDest),

      // Install further dependencies.
      installSubDeps.bind(null, tmpDest, dir)
    ])
  ], cb)
}

// Installs the supplied package including all its sub-dependencies into the
// final directory. Ensures the dependency isn't installed already.
function handleResolvedPkg (dir, pkg, cb) {
  debug('resolved to %s@%s in %s', pkg.name, pkg.version, dir)

  // We need the package uid in order to determine the final directory of the
  // package.
  var finalDest = path.join(dir, pkg.uid)
  var tmpDest = path.join(dir, '.tmp', uuid())

  if (!locks.lock(finalDest)) {
    debug('%s is locked', finalDest)
    var err = new Error(pkg.uid + ' is locked')
    err.code = 'LOCKED'
    return cb(err, pkg)
  }

  // Ensure that the dependency hasn't been installed already.
  fs.stat(finalDest, function (err) {
    if (!err || err.code !== 'ENOENT') return cb(err, pkg)
    async.series([
      recurse.bind(null, dir, tmpDest, pkg),

      // Completes the installation. This step needs to be "as atomic as
      // possible" to ensure that our node_modules is always consistent on a
      // package level.
      fs.rename.bind(null, tmpDest, finalDest),

      // Invoke postinstall scripts
      invokeScripts.bind(null, finalDest)
    ], function (err) {
      cb(err, pkg)
    })
  })
}

// The main entry point into the installation process. Installs a dependency
// specified by name and a semver-compatible version string into the supplied
// directory.
// The passed in callback function will be invoked once the dependency and all
// of its sub-dependencies have been installed, unless there is another
// installation process that locked any of the relevant sub-dependencies.
function install (dir, name, version, cb) {
  debug('installing %s@%s into %s', name, version, dir)

  async.waterfall([
    resolve.bind(null, name, version),
    handleResolvedPkg.bind(null, dir)
  ], cb)
}

module.exports = install
