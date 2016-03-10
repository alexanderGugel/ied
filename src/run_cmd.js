'use strict'

var path = require('path')
var async = require('async')
var config = require('./config')
var child_process = require('child_process')
var assign = require('object-assign')

function runCmd (cwd, argv) {
  var scripts = argv._.slice(1)
  var pkg = require(path.join(cwd, 'package.json'))

  if (!scripts.length) {
    var availableScripts = Object.keys(pkg.scripts || [])
    console.log('Available scripts: ' + availableScripts.join(', '))
    return
  }

  var env = assign({}, process.env, {
    PATH: [
      path.join(cwd, 'node_modules/.bin'), process.env.PATH
    ].join(path.delimiter)
  })

  async.mapSeries(scripts, function execScript (scriptName, cb) {
    var scriptCmd = pkg.scripts[scriptName]
    if (!scriptCmd) return cb(null, null)
    var childProcess = child_process.spawn(config.sh, [config.shFlag, scriptCmd], {
      env: env,
      stdio: 'inherit'
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
