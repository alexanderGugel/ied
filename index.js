var path = require('path')
var http = require('http')
var fs = require('fs')
var semver = require('semver')
var gunzip = require('gunzip-maybe')
var mkdirp = require('mkdirp')
var acc = require('acc')
var tar = require('tar-fs')

function identity (a) { return a }

/**
 * Resolves a dependency to an exact version.
 *
 * @param  {String}   dep     The name of the dependency to be resolved, e.g.
 *                            `tape`.
 * @param  {String}   version The [semver](http://semver.org/) compatible
 *                            version string of the dependency, e.g. ``^5.0.1`.
 * @param  {Function} cb      Callback function to be executed on (successful)
 *                            resolution to an exact version number.
 */
function resolve (dep, version, cb) {
  console.info('resolving', dep + '@' + version)
  cb = cb || function () {}
  http.get('http://registry.npmjs.org/' + dep, function (res) {
    if (res.statusCode !== 200) return cb(new Error('non 200 statusCode from registry', res.statusCode))
    var raw = ''
    res.on('data', function (chunk) { raw += chunk })
    res.on('end', function () {
      var parsed = JSON.parse(raw)
      var resolved = parsed.versions[semver.maxSatisfying(Object.keys(parsed.versions), version)]
      cb(resolved ? null : new Error('no satisfying target found for ' + dep + '@' + version), resolved)
    }).on('error', cb)
  }).on('error', cb)
}

/**
 * Downloads and decodes a dependency.
 *
 * @param  {String}   where Pathname of directory where to put downloaded
 *                          dependency into.
 * @param  {Object}   what  `package.json` of dependency encoded as an object.
 * @param  {Function} cb    Callback function to be executed when download is
 *                          complete.
 */
function fetch (where, what, cb) {
  console.info('fetching', what.name + '@' + what.version, 'into', path.relative(process.cwd(), where))
  cb = cb || function () {}
  http.get(what.dist.tarball, function (res) {
    if (res.statusCode !== 200) return cb(new Error('non 200 statusCode from registry', res.statusCode))
    res.pipe(gunzip()).pipe(tar.extract(where, {
      map: function (header) {
        header.name = header.name.split('/').slice(1).join('/')
        return header
      }
    })).on('finish', cb).on('error', cb)
  }).on('error', cb)
}

/**
 * Recursively installs a dependency.
 *
 * @param {String}  where   Pathname of installation destination.
 * @param {Object}  what    `package.json` of initial dependency
 *                          encoded as an object.
 * @param {Object}  family  object with shasums of [available](https://nodejs.org/api/modules.html#modules_loading_from_node_modules_folders)
 *                          dependencies as keys and arbitrary truthy values.
 * @param {Boolean} devDeps Whether or not to install devDependencies.
 * @param {Boolean} noFetch Whether or not to fetch `what`.
 * @param {Function} cb     Callback function to be executed when installation
 *                          of `what` and all consecutive dependencies is
 *                          complete.
 */
function install (where, what, family, devDeps, noFetch, cb) {
  console.info('installing', what.name + '@' + what.version, 'into', path.relative(process.cwd(), where))
  cb = cb || function () {}

  mkdirp(where, function (err) {
    if (err) return cb(err)

    var onInstalled = acc((!noFetch | 0) + 1, function (errs) {
      if ((errs || []).filter(identity).length) return cb(errs[0])
      if (noFetch) return cb()
      fs.writeFile(path.join(where, 'package.json'), JSON.stringify(what, null, 2), cb)
    })

    var numDeps = Object.keys(what.dependencies || {}).length + (devDeps ? Object.keys(what.devDependencies || {}).length : 0)
    if (!numDeps) onInstalled()

    var onResolved = acc(numDeps, function (errs, deps) {
      if (errs.filter(identity).length) return cb(errs[0])

      deps.forEach(function (dep) {
        if (family[dep.dist.shasum]) return
        family[dep.dist.shasum] = true
        onInstalled.count++
        install(path.join(where, 'node_modules', dep.name), dep, Object.create(family), false, false, onInstalled)
      })

      onInstalled()
    })

    for (var dep in what.dependencies)
      resolve(dep, what.dependencies[dep], onResolved)

    for (dep in (devDeps ? what.devDependencies : {}))
      resolve(dep, what.devDependencies[dep], onResolved)

    if (!noFetch) fetch(where, what, onInstalled)
  })
}

module.exports = {
  resolve: resolve,
  fetch: fetch,
  install: install
}
