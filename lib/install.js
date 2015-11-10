'use strict'

var fs = require('fs')
var async = require('async')
var path = require('path')
var assign = require('object-assign')
var forceSymlink = require('./force_symlink')
var resolve = require('./resolve')
var download = require('./download')
var mkdirp = require('mkdirp')
var util = require('util')
var debug = util.debuglog('install')
var uuid = require('node-uuid')
var config = require('./config')

/**
 * Recursively installs a dependency.
 *
 * @param  {String}   dir     The directory into which the package should be
 *                            installed.
 * @param  {String}   name    The name of the dependency to be installed, e.g.
 *                            `tape`.
 * @param  {String}   version The [semver](http://semver.org/) compatible
 *                            version string of the dependency, e.g. ``^5.0.1`.
 * @param  {Function} cb      Callback function to be executed as soon as the
 *                            installation of the package and all consecutive
 *                            dependencies has been compared.
 * @param  {Object}  [_locks] Optional lock used in order to avoid race
 *                            conditions between redundant installs and
 *                            `mkdirp`. Shared between recursively called
 *                            install functions.
 */
function install (dir, name, version, _locks, cb) {
  // TODO This method should be split up. It does way too much.
  if (typeof _locks !== 'object') {
    cb = _locks
    _locks = Object.create(null)
  }
  cb = cb || function () {}

  debug('install %s@%s into %s', name, version, dir)

  var tmpDest = path.join(config.tmpDir, uuid())

  // Handles the download of actual dependency (without sub-dependencies).
  function fetchDeps (pkg, cb) {
    var tarball = pkg.dist.tarball
    var shasum = pkg.dist.shasum
    debug('downloading %s@%s (%s) from %s', name, version, shasum, tarball)

    download(tmpDest, tarball, shasum, function (err) {
      if (err) {
        debug('%s@%s (%s) download failed: %s \n %s', name, version, shasum, err, err.stack)
        return cb(err)
      }
      debug('successfully downloaded %s@%s (%s)', name, version, shasum)
      // Use package.json from registry instead of the one supplied via
      // the tarball.
      var registryPkg = path.join(tmpDest, '.package.json')
      fs.writeFile(registryPkg, JSON.stringify(pkg, null, 2), 'utf8', cb)
    })
  }

  // Some packages (such as babel-runtime), require files from their
  // own package via `require('my_package/index.js')` instead of
  // `require('./index.js')`.
  function linkSelf (pkg, cb) {
    var srcPath = path.join('..', '..', pkg.dist.shasum, 'package')
    var dstPath = path.join(tmpDest, 'node_modules', pkg.name)
    forceSymlink(srcPath, dstPath, cb)
  }

  // Creates node_modules directory. Required before installation of
  // sub-dependencies.
  function init (cb) {
    mkdirp(path.join(tmpDest, 'node_modules'), cb)
  }

  // Installs sub-dependencies in parallel. The trick here is to start this
  // step before the download of the initial "direct" dependency via
  // "fetchDeps" has been completed.
  function installSubDeps (pkg, cb) {
    var subDependencies = assign({}, pkg.dependencies, pkg.peerDependencies)
    async.forEachOf(subDependencies, function (version, name, cb) {
      install(dir, name, version, _locks, function (err, dep) {
        if (err) return cb(err)
        var srcPath = path.join('..', '..', dep.dist.shasum, 'package')
        var dstPath = path.join(tmpDest, 'node_modules', dep.name)
        forceSymlink(srcPath, dstPath, cb)
      })
    }, cb)
  }

  // Starts installation process. This includes the installation of
  // sub-dependencies and symlinking of dependencies.
  function start (finalDest, pkg, cb) {
    async.parallel([
      fetchDeps.bind(null, pkg),
      async.series.bind(null, [
        init,
        linkSelf.bind(null, pkg),
        installSubDeps.bind(null, pkg)
      ])
    ], function (err) {
      if (err) return cb(err, pkg)
      fs.rename(tmpDest, finalDest, function (err) {
        cb(err, pkg)
      })
    })
  }

  async.waterfall([
    // Resolve dependency to a package.json file.
    resolve.bind(null, name, version),
    function (pkg, cb) {
      if (_locks[pkg.dist.shasum]) {
        debug('%s@%s (%s) is already being installed (locked)', name, version, pkg.dist.shasum)
        return cb(null, pkg)
      }

      // We need the shasum in order to determine the final directory of the
      // package.
      var finalDest = path.join(dir, pkg.dist.shasum)

      // Lock dependency.
      _locks[pkg.dist.shasum] = true

      // Ensure that the dependency hasn't been installed already.
      fs.stat(finalDest, function (err) {
        if (!err || err.code !== 'ENOENT') {
          return cb(err, pkg)
        }

        // Start installation process.
        start(finalDest, pkg, cb)
      })
    }
  ], function (err, pkg) {
    if (err) {
      debug('%s@%s (%s) installation failed: %s \n %s', name, version, pkg.dist.shasum, err, err.stack)
    } else {
      debug('%s@%s (%s) has been installed', name, version, pkg.dist.shasum)
    }
    cb(err, pkg)
  })
}

module.exports = install
