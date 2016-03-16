'use strict'

var async = require('async')
var path = require('path')
var forceSymlink = require('force-symlink')
var debug = require('./debuglog')('expose')
var fs = require('fs')
var config = require('./config')

// Finally symlink if dependency is being installed as an entry.
// Entry dependencies can be required by its name.
function symlinkEntry (dir, pkg, cb) {
  var dstPath = path.join(dir, pkg.name)
  var dirname = path.dirname(pkg.name)
  var srcPath = path.relative(dirname, pkg.uid)
  debug('linking (entry) %s -> %s', srcPath, dstPath)
  forceSymlink(srcPath, dstPath, config.symlinkType, cb)
}

var binMode = parseInt('0777', 8) & (~process.umask())

// Symlinks the bin scripts as specified in the passed in package.json file.
function symlinkScripts (dir, pkg, cb) {
  var info = require(path.join(dir, pkg.uid, 'package.json'))
  var bin = info.bin
  if (typeof bin === 'string') {
    bin = {}
    bin[info.name] = info.bin
  }
  bin = bin || {}
  async.forEachOf(bin, function (pathname, name, cb) {
    var srcPath = path.join('..', pkg.uid, pathname)
    var dstPath = path.join(dir, '.bin', name)
    debug('linking (bin) %s -> %s', srcPath, dstPath)
    async.series([
      forceSymlink.bind(null, srcPath, dstPath, config.symlinkType),
      fs.chmod.bind(null, path.resolve(srcPath, dstPath), binMode)
    ], cb)
  }, cb)
}

// Exposing a dependency means making a dependency `require`able by the outside
// world, which is the current working directory.
function expose (dir, pkg, cb) {
  if (Array.isArray(pkg)) {
    async.map(pkg, expose.bind(null, dir), cb)
    return
  }
  cb = cb || function () {}

  debug('expose %s in %s', pkg.uid, dir)

  async.parallel([
    symlinkEntry.bind(null, dir, pkg),
    symlinkScripts.bind(null, dir, pkg)
  ], function (err) {
    cb(err, pkg)
  })
}

module.exports = expose
