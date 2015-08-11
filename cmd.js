#!/usr/bin/env node

var path = require('path')
var fs = require('fs')
var rimraf = require('rimraf')
var resolve = require('./').resolve
var install = require('./').install

var flags = {}
var targets = process.argv.slice(2).filter(function (target, i, arr) {
  var match = /^--?(.*)$/.exec(target)
  if (!match) return true
  flags[match[1]] = arr.slice(i + 1)
})

function handleError (err) {
  if (!err) return
  throw err
}

var entry

if (flags.help || flags.h) {
  fs.createReadStream(path.join(__dirname, 'USAGE.txt')).pipe(process.stdout)
} else if (flags.bootstrap || flags.b) {
  entry = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json')))
  rimraf.sync(path.join(__dirname, 'node_modules'))
  install(__dirname, entry, {}, true, 0, handleError)
} else if (targets.length) {
  targets.forEach(function (target) {
    resolve(target, target.split('@')[1] || '*', function (err, what) {
      handleError(err)
      install(path.join(process.cwd(), 'node_modules', what.name), what, {}, false, 1, handleError)
    })
  })
} else {
  entry = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json')))
  install(process.cwd(), entry, {}, true, 0, handleError)
}
