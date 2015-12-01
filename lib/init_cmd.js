'use strict'

var init = require('init-package-json')
var path = require('path')

function initCmd (cwd, argv) {
  var initFile = path.resolve(process.env.HOME, '.nom-init')
  init(cwd, initFile, function (err, data) {
    if (err) throw err
  })
}

module.exports = initCmd
