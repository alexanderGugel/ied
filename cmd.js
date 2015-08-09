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

if (flags.help || flags.h) {
  fs.createReadStream(path.join(__dirname, 'USAGE.txt')).pipe(process.stdout)
} else if (flags.bootstrap || flags.b) {
  var entry = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json')))
  install(path.join(process.cwd(), '__bootstrap__'), entry, {}, true, true, function () {
    rimraf.sync(path.join(__dirname, 'node_modules'))
    fs.renameSync(path.join(process.cwd(), '__bootstrap__', 'node_modules'), path.join(process.cwd(), 'node_modules'))
    rimraf.sync(path.join(__dirname, '__bootstrap__'))
    console.info('DONE')
  })
} else if (targets.length) {
  targets.forEach(function (target) {
    resolve(target, target.split('@')[1] || '*', function (err, what) {
      if (err) throw err
      install(path.join(process.cwd(), 'node_modules', what.name), what, [])
    })
  })
} else {
  var entry = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json')))
  install(process.cwd(), entry, {}, true, true, function () {
    console.info('DONE')
  })
}
