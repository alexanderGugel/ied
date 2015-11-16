'use strict'

var async = require('async')
var link = require('./link')

function handleError (err) {
  if (err) throw err
}

function linkCmd (cwd, argv) {
  var deps = argv._.slice(1)
  if (!deps.length) {
    link.linkToGlobal(cwd, handleError)
  } else {
    async.each(deps, link.linkFromGlobal.bind(null, cwd), handleError)
  }
}

module.exports = linkCmd
