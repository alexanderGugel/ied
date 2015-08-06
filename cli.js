#!/usr/bin/env node
var path = require('path')
var http = require('http')
var fs = require('fs')
var semver = require('semver')
var gunzip = require('gunzip-maybe')
var mkdirp = require('mkdirp')
var tar = require('tar-fs')

function resolve (dep, version, cb) {
  console.info('resolving', dep + '@' + version)
  http.get('http://registry.npmjs.org/' + dep, function (res) {
    var raw = ''
    res.on('data', function (chunk) { raw += chunk }).on('end', function () {
      var parsed = JSON.parse(raw)
      var resolved = parsed.versions[semver.maxSatisfying(Object.keys(parsed.versions), version)]
      cb(resolved ? null : new Error('No satisfying target found for ' + dep + '@' + version), resolved)
    }).on('error', cb)
  }).on('error', cb)
}

function fetch (where, what) {
  console.info('fetching', what.name + '@' + what.version, 'into', path.relative(__dirname, where))
  http.get(what.dist.tarball, function (res) {
    res.pipe(gunzip()).pipe(tar.extract(where, {
      map: function (header) {
        header.name = header.name.substr('package/'.length)
        return header
      },
      ignore: function (name) {
        return name === path.join(where, 'package.json')
      }
    }))
  })
}

function install (where, what, family, entry) {
  console.info('installing', what.name + '@' + what.version, 'into', path.relative(__dirname, where))
  family = family.slice()
  mkdirp.sync(where)
  var deps = []
  function onResolved (err, resolved) {
    if (err) throw err
    deps.push(resolved)
    if (deps.length === Object.keys(what.dependencies).length) onResolvedAll()
  }
  function onResolvedAll () {
    deps.forEach(function (dep) {
      if (family.indexOf(dep.dist.shasum) > -1) return
      family.push(dep.dist.shasum)
      // `entry ? [] : family` ensures that uninstalling a single "immediate"
      // dependency doesn't break subsequent dependencies.
      process.nextTick(install.bind(null, path.join(where, 'node_modules', dep.name), dep, entry ? [] : family))
    })
  }
  for (var dep in what.dependencies)
    resolve(dep, what.dependencies[dep], onResolved)
  if (entry) {
    for (dep in what.devDependencies)
      resolve(dep, what.devDependencies[dep], onResolved)
  } else {
    fs.writeFile(path.join(where, 'package.json'), JSON.stringify(what, null, 2))
    fetch(where, what)
  }
}

var targets = process.argv.slice(2)

if (targets.length) {
  targets.forEach(function (target) {
    resolve(target, target.split('@')[1] || '*', function (err, what) {
      if (err) throw err
      install(path.join(__dirname, 'node_modules', what.name), what, [])
    })
  })
} else {
  var entry = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json')))
  install(__dirname, entry, [], true)
}
