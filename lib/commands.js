'use strict'

var path = require('path')
var fs = require('fs')
var async = require('async')
var install = require('./install')
var init = require('./init')
var expose = require('./expose')
var ping = require('./ping')
var save = require('./save')
var assign = require('object-assign')
var child_process = require('child_process')

var cwd = process.cwd()
var sh = process.platform === 'win32'
? process.env.ComSpec || 'cmd'
: process.env.SHELL || 'bash'

// Internal environment variables used for `shell` and `run`.
var env = assign({}, process.env, {
  PATH: [path.join(cwd, 'node_modules/.bin'), process.env.PATH].join(path.delimiter)
})

function handleErrSync (err) {
  if (err) throw err
}

function readPackageSync () {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(cwd, 'package.json'), 'utf8')
    )
  } catch (e) {
    console.error('Failed to read in package.json')
    throw e
  }
}

function installCmd (argv) {
  var node_modules = path.join(cwd, 'node_modules')
  var deps = argv._.slice(1)

  if (!deps.length) {
    // Read dependencies from package.json when no specific targets are supplied.
    var pkg = readPackageSync()
    var onlyDeps
    if (argv.only) {
      var field = ({
        'prod': 'dependencies',
        'production': 'dependencies',
        'dev': 'devDependencies',
        'development': 'devDependencies'
      })[argv.only] || argv.only
      onlyDeps = pkg[field] || {}
    }
    deps = onlyDeps || assign({}, pkg.dependencies, pkg.devDependencies)
    deps = Object.keys(deps).map(function (name) {
      return [ name, deps[name] ]
    })
  } else {
    // Use supplied dependencies if available.
    deps = deps.map(function (target) {
      target = target.split('@')
      return [ target[0], target[1] || '*' ]
    })
  }

  init(cwd, function (err) {
    handleErrSync(err)

    var _locks = Object.create(null)

    var installAll = async.map.bind(null, deps, function (target, cb) {
      var name = target[0]
      var version = target[1]
      install(node_modules, name, version, _locks, cb)
    })

    var exposeAll = expose.bind(null, node_modules)
    var waterfall = [ installAll, exposeAll ]

    if (argv.save) {
      waterfall.push(save.bind(null, cwd, 'dependencies'))
    }

    if (argv['save-dev']) {
      waterfall.push(save.bind(null, cwd, 'devDependencies'))
    }

    async.waterfall(waterfall, handleErrSync)
  })
}

function helpCmd () {
  fs.createReadStream(path.join(__dirname, 'USAGE.txt')).pipe(process.stdout)
}

function shellCmd () {
  child_process.spawn(sh, [], {
    stdio: 'inherit',
    env: env
  })
}

function runCmd (argv) {
  var scripts = argv._.slice(1)
  var pkg = readPackageSync()

  if (!scripts.length) {
    var availableScripts = Object.keys(pkg.scripts || [])
    console.log('Available scripts: ' + availableScripts.join(', '))
    return
  }

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
    handleErrSync(err)
    var info = scripts.map(function (script, i) {
      return script + ' exited with status ' + statuses[i]
    }).join('\n')
    console.log(info)
    var success = statuses.every(function (code) { return code === 0 })
    process.exit(success | 0)
  })
}

function pingCmd () {
  ping(function (err, data) {
    handleErrSync(err)
    console.log('PONG')
  })
}

var commands = {
  installCmd: installCmd,
  helpCmd: helpCmd,
  shellCmd: shellCmd,
  runCmd: runCmd,
  pingCmd: pingCmd
}

module.exports = commands
