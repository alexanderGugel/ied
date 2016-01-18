'use strict'

var init = require('init-package-json')
var path = require('path')

var isWindows = process.platform === 'win32'
var home = process.env[isWindows ? 'USERPROFILE' : 'HOME']

function initCmd (cwd, argv) {
  var initFile = path.resolve(home, '.ied-init')
  init(cwd, initFile, function (err, data) {
    if (err && err.message === 'canceled') {
      console.log('init canceled!')
      return
    }

    throw err
  })
}

module.exports = initCmd
