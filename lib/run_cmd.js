'use strict'

var path = require('path')
var async = require('async')
var assign = require('object-assign')
var child_process = require('child_process')

function runCmd (cwd, argv) {
  var scripts = argv._.slice(1)
  var pkg = require(path.join(cwd, 'package.json'))

  if (!scripts.length) {
    var availableScripts = Object.keys(pkg.scripts || [])
    console.log('Available scripts: ' + availableScripts.join(', '))
    return
  }

  var env = assign({}, process.env, {
    PATH: [path.join(cwd, 'node_modules/.bin'), process.env.PATH].join(path.delimiter)
  })

  async.mapSeries(scripts, function execScript (scriptName, cb) {
    var script = pkg.scripts[scriptName]
    if (!script) return cb(null, null)
    var childProcess = child_process.spawn(script, {
      env: env,
      stdio: [0, 1, 2]
    })
    childProcess.on('close', cb.bind(null, null))
    childProcess.on('error', cb)
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
