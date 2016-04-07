var path = require('path')
var async = require('async')
var config = require('./config')
var child_process = require('child_process')
var assign = require('object-assign')

function runCommand (pkgName, scriptName, cwd, command, cb) {
  var env = assign({}, process.env, {
    PATH: [
      path.join(cwd, 'node_modules/.bin'), process.env.PATH
    ].join(path.delimiter)
  })
  var childProcess = child_process.spawn(config.sh, [config.shFlag, command], {
    cwd: cwd,
    env: env,
    stdio: 'inherit'
  })
  childProcess.on('close', function (code) {
    cb(code
      ? new Error('Command `' + command + '` ended with code ' +
        '`' + code + '` during script `' + scriptName +
        '` in package `' + pkgName + '`')
      : null)
  })
  childProcess.on('error', cb)
}

module.exports = function (cwd, pkg, script, cb) {
  var tasks = [
    'pre' + script,
    script,
    'post' + script
  ].map(function (scriptName) {
    if (pkg.scripts && pkg.scripts[scriptName]) {
      return runCommand.bind(
        null,
        pkg.name,
        scriptName,
        cwd,
        pkg.scripts[scriptName]
      )
    }
  }).filter(function (task) {
    return task
  })
  async.series(tasks, cb)
}
