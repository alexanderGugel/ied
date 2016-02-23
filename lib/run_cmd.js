'use strict'

var path = require('path')
var async = require('async')
var run = require('./run')

function runCmd (cwd, argv) {
  var scripts = argv._.slice(1)
  var pkg = require(path.join(cwd, 'package.json'))

  if (!scripts.length) {
    var availableScripts = Object.keys(pkg.scripts || [])
    console.log('Available scripts: ' + availableScripts.join(', '))
    return
  }

  async.mapSeries(scripts, function execScript (scriptName, cb) {
    run(cwd, pkg, scriptName, cb)
  }, function (err, statuses) {
    if (err) throw err
    var info = scripts.map(function (script, i) {
      return script + ' exited with status ' + statuses[i]
    }).join('\n')
    console.log(info)
    var success = statuses.every(function (code) { return code === 0 })
    process.exit(success | 0)
  })
}

module.exports = runCmd
