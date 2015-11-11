'use strict'

var path = require('path')
var config = require('./config')
var assign = require('object-assign')
var child_process = require('child_process')

function shellCmd (cwd) {
  var env = assign({}, process.env, {
    PATH: [
      path.join(cwd, 'node_modules/.bin'), process.env.PATH
    ].join(path.delimiter)
  })

  child_process.spawn(config.sh, [], {
    stdio: 'inherit',
    env: env
  })
}

module.exports = shellCmd
