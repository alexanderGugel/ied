'use strict'

var async = require('async')
var link = require('./link')

function handleError (err) {
  if (err) throw err
}

function unlinkCmd (cwd, argv) {
  var deps = argv._.slice(1)
  if (!deps.length) {
    link.unlinkToGlobal(cwd, handleError)
  } else {
    async.each(deps, link.unlinkFromGlobal.bind(null, cwd), handleError)
  }
}

module.exports = unlinkCmd
