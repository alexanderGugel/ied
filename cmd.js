#!/usr/bin/env node

var path = require('path')
var fs = require('fs')
var resolve = require('./').resolve
var install = require('./').install

var flags = {}
var targets = process.argv.slice(2).filter(function (target, i, arr) {
  var match = /^--?(.*)$/.exec(target)
  if (!match) return true
  flags[match[1]] = arr.slice(i + 1)
})

if (flags.help || flags.h) {
  fs.createReadStream(path.join(__dirname, 'USAGE.txt')).pipe(process.stdout)
} else if (targets.length) {
  targets.forEach(function (target) {
    resolve(target, target.split('@')[1] || '*', function (err, what) {
      if (err) throw err
      install(path.join(process.cwd(), 'node_modules', what.name), what, [])
    })
  })
} else {
  var entry = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json')))
  install(process.cwd(), entry, [], true)
}
