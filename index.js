var path = require('path')
var http = require('http')
var fs = require('fs')
var semver = require('semver')
var gunzip = require('gunzip-maybe')
var mkdirp = require('mkdirp')
var acc = require('acc')
var tar = require('tar-fs')
// var async = require('async')
var assign = require('object-assign')

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
 * @param {Number} depth    Depth of the current dependency.
 *                          Dependencies with a depth of 0 won't be fetched,
 *                          binaries of dependencies with a depth of 1 will be
 *                          symlinked into `node_modules/.bin`.
 * @param {Function} cb     Callback function to be executed when installation
 *                          of `what` and all consecutive dependencies is
 *                          complete.
 */
function install (where, what, family, devDeps, depth, cb) {
  console.info('installing', what.name + '@' + what.version, 'into', path.relative(process.cwd(), where))
  cb = cb || function () {}
  mkdirp(where, function (err) {
    if (err) return cb(err)

    var deps = assign({}, what.dependencies, devDeps ? what.devDependencies : {})
    var numDeps = Object.keys(deps).length

    var onInstalled = acc((depth === 0 ? 0 : 1) + 1, function (errs) {
      if ((errs || []).filter(identity).length) return cb(errs.filter(identity)[0])
      if (depth === 0) return cb()
      fs.writeFile(path.join(where, 'package.json'), JSON.stringify(what, null, 2), cb)
    })

    var onResolved = acc(numDeps, function (errs, deps) {
      // TODO WRONG! errs[0] might be undefined, and errs[1] might be set
      if (errs.filter(identity).length) return cb(errs.filter(identity)[0])

      deps.forEach(function (dep) {
        if (family[dep.dist.shasum]) return
        family[dep.dist.shasum] = true
        onInstalled.count++
        install(path.join(where, 'node_modules', dep.name), dep, Object.create(family), false, depth + 1, onInstalled)
      })

      onInstalled()
    })

    if (!numDeps) onInstalled()
    for (var dep in deps) resolve(dep, what.dependencies[dep], onResolved)

    if (depth > 0) {
      fetch(where, what, function (err) {
        if (err) return cb(err)
        if (depth > 1) return onInstalled()
        linkBin(where, what, path.join(where, '..', '.bin'), onInstalled)
      })
    }

  })
}

/**
 * Symlinks the scripts exported via `what`'s `bin` field.
 *
 * @param {String}  where             Pathname of current installation.
 * @param {Object}  what              `package.json` of module to be symlinked.
 * @param {Object|String}  what.bin   Mapping of scripts to their pathname.
 * @param  {String}   to              Destination directory of symlinks.
 * @param  {Function} cb              Callback to be executed one all scripts
 *                                    have been symlinked into the given
 *                                    directory.
 */
function linkBin (where, what, to, cb) {
  cb = cb || function () {}
  mkdirp(to, function (err) {
    if (err) return cb(err)

    var bin = what.bin
    if (typeof bin === 'string') {
      bin = {}
      bin[what.name] = what.bin
    }
    bin = bin || {}

    var onLinked = acc(Object.keys(bin).length + 1, function (errs) {
      if ((errs || []).filter(identity).length) return cb(errs.filter(identity)[0])
      cb()
    })
    onLinked()

    for (var name in bin)
      fs.symlink(path.join(path.relative(to, where), bin[name]), path.join(to, name), onLinked)
  })
}

module.exports = {
  resolve: resolve,
  fetch: fetch,
  install: install,
  linkBin: linkBin
}
