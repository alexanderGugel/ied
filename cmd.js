#!/usr/bin/env node

'use strict'

var path = require('path')
var fs = require('fs')
var async = require('async')
var install = require('./install')
var init = require('./init')
var log = require('a-logger')

var flags = {}
var targets = process.argv.slice(2).filter(function (target, i, arr) {
  var match = /^--?(.*)$/.exec(target)
  if (!match) return true
  flags[match[1]] = arr.slice(i + 1)
})

if (flags.help || flags.h) {
  return fs.createReadStream(path.join(__dirname, 'USAGE.txt')).pipe(process.stdout)
}

function handleError (msg, err) {
  if (err) log.error(msg, err)
}

function installDeps (dir, deps, cb) {
  init(dir, function (err) {
    if (err) return cb(err)

    async.forEachOf(deps, function (version, name, cb) {
      install(name, version, path.join(dir, 'node_modules'), true, cb)
    }, cb)
  })
}

var deps

if (targets.length) {
  deps = targets.reduce(function (deps, target) {
    target = target.split('@')
    var name = target[0]
    var version = target[1] || '*'

    deps[name] = version
    return deps
  }, {})
  installDeps(process.cwd(), deps, handleError.bind(null, 'Failed to install dependencies'))
} else {
  try {
    deps = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
    ).dependencies
  } catch (e) {
    log.error('Failed to load package.json', e)
    process.exit(1)
  }
  installDeps(process.cwd(), deps, handleError.bind(null, 'Failed to install dependencies'))
}
