'use strict'

var fs = require('fs')
var expose = require('./expose')
var async = require('async')
var path = require('path')

function exposeCmd (cwd, argv) {
  var shasums = argv._.slice(1)
  var node_modules = path.join(cwd, 'node_modules')

  async.map(shasums, function (shasum, cb) {
    var pkgPath = path.join(node_modules, shasum, 'package/package.json')
    fs.readFile(pkgPath, 'utf8', function (err, raw) {
      if (err) return cb(err)
      try {
        var pkg = JSON.parse(raw)
      } catch (e) {
        if (e) return cb(err)
      }

      pkg.dist = { shasum: shasum }

      expose(node_modules, pkg, cb)
    })
  }, function (err) {
    if (err) throw err
  })
}

module.exports = exposeCmd
