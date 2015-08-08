#!/usr/bin/env node
var path = require('path')
var http = require('http')
var fs = require('fs')
var semver = require('semver')
var gunzip = require('gunzip-maybe')
var mkdirp = require('mkdirp')
var tar = require('tar-fs')

function resolve (dep, version, cb) {
  cb = cb || function () {}
  console.info('resolving', dep + '@' + version)
  http.get('http://registry.npmjs.org/' + dep, function (res) {
    if (res.statusCode !== 200) return cb(new Error('non 200 statusCode from resgitry: ' + res.statusCode))
    var raw = ''
    res.on('data', function (chunk) { raw += chunk }).on('end', function () {
      var parsed = JSON.parse(raw)
      var resolved = parsed.versions[semver.maxSatisfying(Object.keys(parsed.versions), version)]
      cb(resolved ? null : new Error('no satisfying target found for ' + dep + '@' + version), resolved)
    }).on('error', cb)
  }).on('error', cb)
}

function fetch (where, what, cb) {
  cb = cb || function () {}
  console.info('fetching', what.name + '@' + what.version, 'into', path.relative(process.cwd(), where))
  http.get(what.dist.tarball, function (res) {
    if (res.statusCode !== 200) return cb(new Error('non 200 statusCode from resgitry: ' + res.statusCode))
    res.pipe(gunzip()).pipe(tar.extract(where, {
      map: function (header) {
        header.name = header.name.split('/').slice(1).join('/')
        return header
      }
    })).on('finish', cb).on('error', cb)
  }).on('error', cb)
}

function install (where, what, family, entry) {
  console.info('installing', what.name + '@' + what.version, 'into', path.relative(process.cwd(), where))
  family = family.slice()
  mkdirp.sync(where)
  var deps = []
  function onResolved (err, resolved) {
    deps.push(resolved)
    if (deps.length === Object.keys(what.dependencies).length + (entry ? Object.keys(what.devDependencies || {}).length : 0)) onResolvedAll()
  }
  function onResolvedAll () {
    deps.forEach(function (dep) {
      if (family.indexOf(dep.dist.shasum) > -1) return
      family.push(dep.dist.shasum)
      process.nextTick(install.bind(null, path.join(where, 'node_modules', dep.name), dep, family))
    })
  }
  for (var dep in what.dependencies)
    resolve(dep, what.dependencies[dep], onResolved)
  if (entry) {
    for (dep in what.devDependencies)
      resolve(dep, what.devDependencies[dep], onResolved)
  } else {
    fetch(where, what, function (err) {
      if (err) throw err
      fs.writeFile(path.join(where, 'package.json'), JSON.stringify(what, null, 2))
    })
  }
}

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
