'use strict'

const mkdirp = require('mkdirp')
const path = require('path')

function init (dir, cb) {
  cb = cb || function () {}

  mkdirp(path.join(dir, 'node_modules', '.bin'), cb)
}

module.exports = init
