'use strict'

var async = require('async')
var path = require('path')
var forceSymlink = require('./force_symlink')
var util = require('util')
var debug = util.debuglog('expose')

function expose (dir, pkg, cb) {
  debug('expose %s in %s', pkg.dist.shasum, dir)

  async.parallel([
    // Finally symlink if dependency is being installed as an entry.
    // Entry dependencies can be required by their name.
    function (cb) {
      var srcPath = path.join(pkg.dist.shasum, 'package')
      var dstPath = path.join(dir, pkg.name)
      debug('linking (entry) %s -> %s', srcPath, dstPath)
      forceSymlink(srcPath, dstPath, cb)
    },

    // Link all scripts.
    function (cb) {
      var bin = pkg.bin

      if (typeof bin === 'string') {
        bin = {}
        bin[pkg.name] = pkg.bin
      }

      async.forEachOf(bin, function (pathname, name, cb) {
        var srcPath = path.join('..', pkg.dist.shasum, 'package', pathname)
        var dstPath = path.join(dir, '.bin', name)
        debug('linking (bin) %s -> %s', srcPath, dstPath)
        forceSymlink(srcPath, dstPath, cb)
      }, cb)
    }
  ], cb)
}

module.exports = expose
