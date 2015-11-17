'use strict'

var async = require('async')
var link = require('./link')
var config = require('./config')
var mkdirp = require('mkdirp')
var path = require('path')

function handleError (err) {
  if (err) throw err
}

function linkCmd (cwd, argv) {
  var deps = argv._.slice(1)
  if (!deps.length) {
    async.series([
      mkdirp.bind(null, config.globalNodeModules),
      mkdirp.bind(null, config.globalBin),
      link.linkToGlobal.bind(null, cwd)
    ], handleError)
  } else {
    async.series([
      mkdirp.bind(null, path.join(cwd, 'node_modules')),
      async.each.bind(null, deps, link.linkFromGlobal.bind(null, cwd))
    ], handleError)
  }
}

module.exports = linkCmd
