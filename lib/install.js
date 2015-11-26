'use strict'

var fs = require('fs')
var async = require('async')
var path = require('path')
var mkdirp = require('mkdirp')
var assign = require('object-assign')
var debug = require('./debuglog')('install')
var uuid = require('node-uuid')
var forceSymlink = require('./force_symlink')
var resolve = require('./resolve')
var fetch = require('./fetch')
var EventEmitter = require('events').EventEmitter

// `bus` is a shared event bus that enables concurrent installations.
// `cache` is being used in order to avoid any sort of IO with the fs itself.

function emitInstalled (bus, cache, dir) {
  cache[dir] = 'INSTALLED'
  bus.emit(dir + ':installed')
}

function emitInstalling (bus, cache, dir) {
  cache[dir] = 'INSTALLING'
  bus.emit(dir + ':installing')
}

function isInstalled (bus, cache, dir, cb) {
  if (dir in bus) {
    return cb(null, bus[dir] === 'INSTALLED')
  }
  fs.lstat(dir, function (err, stat) {
    if (err && err.code !== 'ENOENT') return cb(err)
    var exists = !err
    cache[dir] = exists
    cb(null, exists)
  })
}

function isInstalling (cache, dir, cb) {
  cb(null, cache[dir] === 'INSTALLING')
}

function emitError (bus, cache, dir, err) {
  delete cache[dir]
  bus.emit(dir + ':error', err)
}

// Will be fired as soon as all dirs have been created.
// When a dependency is being installed, it expects this function to be
// invoked as soon as all of its dependencies have been installed.
function onInstalled (bus, cache, dirs, cb) {
  dirs.forEach(function (dir) {

  })
}












// Exposes the dependency defined via pkg to the package defined via its root
// directory `dir`. Correctly handles scoped modules.
function linkPkg (dir, pkg, cb) {
  var dstPath = path.join(dir, 'node_modules', pkg.name)
  var srcPath = path.relative(
    path.join(dstPath, 'node_modules'),
    path.join(dir, 'node_modules', pkg.dist.shasum, 'package')
  )

  // path.dirname('@hello/world') #=> 'hello'
  // path.dirname('world') #=> '.'
  async.series([
    mkdirp.bind(null, path.join(dir, 'node_modules', path.dirname(pkg.name))),
    forceSymlink.bind(null, srcPath, dstPath)
  ], cb)
}

// The main entry point into the installation process. Installs a dependency
// specified by name and a semver-compatible version string into the supplied
// directory.
// The passed in callback function will be invoked once the dependency and all
// of its sub-dependencies have been installed, unless there is another
// installation process that locked any of the relevant sub-dependencies.
function install (bus, cache, dir, name, version, cb) {
  debug('installing %s@%s into %s', name, version, dir)

  console.log(name, version)

  // resolve(name, version, function (err, pkg) {
  //   if (err) return cb(err, null)
  //   var shasum = pkg.dist.shasum
    
  //   // var tmpDest = path.join(dir, shasum)
  //   // var \Dest = path.join(dir, shasum)
  //   // var tmpDest = path.join(dir, shasum)


  // })

  // async.waterfall([
  //   resolve.bind(null, name, version),
  //   handleResolvedPkg.bind(null, dir)
  // ], cb)
}

module.exports = install
