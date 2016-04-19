'use strict'

var fs = require('fs')
var async = require('async')
var path = require('path')
var mkdirp = require('mkdirp')
var assign = require('object-assign')
var debug = require('./debuglog')('install')
var uuid = require('node-uuid')
var forceSymlink = require('force-symlink')
var resolve = require('./resolve')
var fetch = require('./fetch')
var run = require('./run')
var locks = require('./locks')
var config = require('./config')
var Installer = require('./Installer')

// Exposes the dependency defined via pkg to the package defined via its root
// directory `dir`. Correctly handles scoped modules.
function linkPkg (dir, pkg, cb) {
  var dstPath = path.join(dir, 'node_modules', pkg.name)
  var srcPath = path.relative(
    path.join(dstPath, 'node_modules'),
    path.join(dir, 'node_modules', pkg.uid)
  )

  // path.dirname('@hello/world') #=> 'hello'
  // path.dirname('world') #=> '.'
  async.series([
    mkdirp.bind(null, path.join(dir, 'node_modules', path.dirname(pkg.name))),
    forceSymlink.bind(null, srcPath, dstPath, config.symlinkType)
  ], cb)
}

// Invoke lifecycle scripts, such as postinstall
function invokeScripts (dir, cb) {
  var pkg = require(path.join(dir, 'package.json'))
  var files = fs.readdirSync(dir)
  if (!pkg.scripts) {
    pkg.scripts = {}
  }
  if (files.indexOf('binding.gyp') > -1 && !pkg.scripts.install) {
    pkg.scripts.install = 'node-gyp rebuild'
  }
  run(dir, pkg, 'install', cb)
}

// Installs sub-dependencies in parallel. The trick here is to start this step
// before the fetch of the initial "direct" dependency via "fetchDep" has
// been completed.
function installSubDeps (tmpDest, dir, pkg, cb) {
  // `peerDependencies` can be treated **exactly** like regular dependencies,
  // since identical dependencies will **always** be shared.
  var subDependencies = assign({}, pkg.dependencies, pkg.peerDependencies)
  async.forEachOf(subDependencies, function (version, name, cb) {
    install(dir, name, version, function (err, dep) {
      if (err && err.code !== 'LOCKED') return cb(err)
      linkPkg(tmpDest, dep, cb)
    })
  }, cb)
}

// Starts the installation process. This includes the installation of
// sub-dependencies and symlinking of dependencies.
// The installation process consists of the following steps:
//
// 1. Download of the **dependency** itself.
// 2. Initialization of node_modules directory.
// 3. Symlinking of the dependency itself.
// 4. Installation of sub-dependencies.
function recurse (dir, tmpDest, pkg, cb) {
  debug('recursively installing %s@%s into %s from %s', pkg.name, pkg.version, tmpDest, dir)

  async.series([
    // Creates node_modules directory. Required before installation of
    // sub-dependencies. `tar-fs` uses `mkdirp` under the hood, but we can't
    // rely on it, since we install further sub-dependencies in parallel.
    mkdirp.bind(null, path.join(tmpDest, 'node_modules')),

    // Some packages (such as `babel-runtime`), require files from their own
    // package via `require('my_package/index.js')` instead of for example
    // `require('./index.js')`.
    linkPkg.bind(null, tmpDest, pkg),

    async.waterfall.bind(null, [
      fetch.bind(null, tmpDest, pkg.tarball, pkg.uid, pkg.shasum),

      // Read dependency information
      readPackage.bind(null, tmpDest),

      // Install further dependencies.
      installSubDeps.bind(null, tmpDest, dir)
    ])
  ], cb)
}

// Installs the supplied package including all its sub-dependencies into the
// final directory. Ensures the dependency isn't installed already.
function handleResolvedPkg (dir, result, cb) {
  const pkgJSON = result.pkgJSON
  const id = result.id

  debug('resolved to %s@%s in %s', pkgJSON.name, pkgJSON.version, dir)

  // We need the package uid in order to determine the final directory of the
  // package.
  // var finalDest = path.join(dir, pkg.uid)
  var tmpDest = path.join(dir, '.tmp', uuid())

  if (!locks.lock(id)) {
    debug('%s is locked', id)
    var err = new Error(id + ' is locked')
    err.code = 'LOCKED'
    return cb(err, pkgJSON)
  }

  // Ensure that the dependency hasn't been installed already.
  fs.stat(finalDest, function (err) {
    if (!err || err.code !== 'ENOENT') return cb(err, pkg)
    async.series([
      recurse.bind(null, dir, tmpDest, pkg),

      // Completes the installation. This step needs to be "as atomic as
      // possible" to ensure that our node_modules is always consistent on a
      // package level.
      fs.rename.bind(null, tmpDest, finalDest),

      // Invoke postinstall scripts
      invokeScripts.bind(null, finalDest)
    ], function (err) {
      cb(err, pkg)
    })
  })
}

/**
 * merge dependency fields.
 * @param  {Object} pkgJSON - `package.json` object from which the dependencies
 * should be obtained.
 * @param  {Array.<String>} fields - property names of dependencies to be merged
 * together.
 * @return {Object} - merged dependencies.
 */
function mergeDependencies (pkgJSON, fields) {
  var allDependencies = {}
  for (var i = 0; i < fields.length; i++) {
    var field = fields[i]
    var dependencies = pkgJSON[field] || {}
    var names = Object.keys(dependencies)
    for (var j = 0; j < names.length; j++) {
      var name = names[j]
      allDependencies[name] = dependencies[name]
    }
  }
  return allDependencies
}

/**
 * extract an array of bundled dependency names from the passed in
 * `package.json`. uses the `bundleDependencies` and `bundledDependencies`
 * properties.
 * @param  {Object} pkgJSON - plain JavaScript object representing a
 * `package.json` file.
 * @return {Array.<String>} - array of bundled dependency names.
 */
function parseBundleDependencies (pkgJSON) {
  var bundleDependencies = (pkgJSON.bundleDependencies || [])
    .concat(pkgJSON.bundledDependencies || [])
  return bundleDependencies
}

/**
 * extract specified dependencies from a specific `package.json`.
 * @param  {Object} pkgJSON - plain JavaScript object representing a
 * `package.json` file.
 * @param  {Array.<String>} fields - array of dependency fields to be followed.
 * @return {Array} - array of dependency pairs.
 */
function parseDependencies (pkgJSON, fields) {
  // bundleDependencies and bundledDependencies are optional. we need to
  // exclude those form the final [name, version] pairs that we're generating.
  var bundleDependencies = parseBundleDependencies(pkgJSON)
  var allDependencies = mergeDependencies(pkgJSON, fields)
  var names = Object.keys(allDependencies)
  var results = []
  for (var i = 0; i < names.length; i++) {
    var name = names[i]
    if (bundleDependencies.indexOf(name) === -1) {
      results.push([name, allDependencies[name]])
    }
  }
  return results
}

var EventEmitter = require('events').EventEmitter

function Installer (baseDir) {
  EventEmitter.call(this)
  this.baseDir = path.join(baseDir, 'node_modules')
  this.locks = Object.create(null)
  this.on('resolved', this.handleResolved.bind(this))
}

Installer.prototype = Object.create(EventEmitter.prototype)
Installer.prototype.constructor = Installer

Installer.create = function (baseDir, cb) {
  var installer = new Installer(baseDir)
  installer.init(function (err) {
    if (err) return cb(err)
    cb(null, installer)
  })
}

Installer.prototype.init = function (cb) {
  mkdirp(this.baseDir, cb)
}

Installer.prototype.schedule = function (name, version) {
  var self = this

  resolve(name, version, function (error, result) {
    if (error) return self.emit('error', error)

    // dependency is already being installed.
    if (self.locks[result.shasum]) return
    self.locks[result.shasum] = true

    self.emit('resolved', result)
  })
}

Installer.prototype.handleResolved = function (result) {
  var self = this

  var dependencies = parseDependencies(result.pkgJSON, ['dependencies'])
  for (var i = 0; i < dependencies.length; i++) {
    var dependency = dependencies[i]
    self.schedule(dependency[0], dependency[1])
  }

  var target = path.join(self.baseDir, result.shasum)
  result.download(target, function (error) {
    if (error) return self.emit('error', error)
    self.emit('downloaded', result)
  })
}

Installer.create(process.cwd(), function (err, installer) {
  if (err) throw err
  installer.schedule('tap', '*')
})
