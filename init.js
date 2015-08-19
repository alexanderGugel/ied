'use strict'

var mkdirp = require('mkdirp')
var path = require('path')

function init (dir, cb) {
  mkdirp(path.join(dir, 'node_modules', '.bin'), cb)
}

module.exports = init
