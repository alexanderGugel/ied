'use strict'

var async = require('async')
var path = require('path')
var forceSymlink = require('./force_symlink')
var mkdirp = require('mkdirp')
var debug = require('debug')('expose')

// Finally symlink if dependency is being installed as an entry.
// Entry dependencies can be required by its name.
function symlinkEntry (dir, pkg, cb) {
  var dstPath = path.join(dir, pkg.name)
  var series = []
  var dirname = path.dirname(pkg.name)
  var srcPath = path.relative(dirname, pkg.uid)
  series.push(mkdirp.bind(null, path.join(dir, dirname)))
  series.push(forceSymlink.bind(null, srcPath, dstPath))
  debug('linking (entry) %s -> %s', srcPath, dstPath)
  async.series(series, cb)
}

// Symlinks the bin scripts as specified in the passed in package.json file.
function symlinkScripts (dir, pkg, cb) {
  var bin = pkg.bin
  if (typeof bin === 'string') {
    bin = {}
    bin[pkg.name] = pkg.bin
  }
  bin = bin || {}
  async.forEachOf(bin, function (pathname, name, cb) {
    var srcPath = path.join('..', pkg.uid, pathname)
    var dstPath = path.join(dir, '.bin', name)
    debug('linking (bin) %s -> %s', srcPath, dstPath)
    forceSymlink(srcPath, dstPath, cb)
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
