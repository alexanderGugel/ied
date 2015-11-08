'use strict'

var fs = require('fs')
var async = require('async')
var path = require('path')
var assign = require('object-assign')
var forceSymlink = require('./force_symlink')
var resolve = require('./resolve')
var download = require('./download')
var ignoreError = require('./ignore_error')
var util = require('util')
var debug = util.debuglog('install')

/**
 * Recursively installs a dependency.
 *
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
  if (typeof _locks !== 'object') {
    cb = _locks
    _locks = Object.create(null)
  }
  cb = cb || function () {}

  debug('install %s@%s into %s', name, version, dir)

  async.waterfall([

    // Resolve dependency to a package.json file.
    resolve.bind(null, name, version),

    function (pkg, cb) {
      if (_locks[pkg.dist.shasum]) {
        debug('%s@%s (%s) is already being installed (locked)', name, version, pkg.dist.shasum)
        return cb(null, pkg)
      }

      // Lock dependency.
      _locks[pkg.dist.shasum] = true

      fs.mkdir(path.join(dir, pkg.dist.shasum), function (err) {
        // If the dependency has already been installed (= shasum dir exists),
        // we abort the installation procedure.
        if (err && err.code === 'EEXIST') {
          debug('%s@%s (%s) already installed', name, version, pkg.dist.shasum)
          return cb(null, pkg)
        }

        // If there is still an error, something unexpected happened.
        if (err) {
          debug('%s@%s (%s) failed to mkdirp: %s \n %s', name, version, pkg.dist.shasum, err, err.stack)
          return cb(err, pkg)
        }

        async.parallel([
          function (cb) {
            var tarball = pkg.dist.tarball
            var shasum = pkg.dist.shasum

            debug('downloading %s@%s (%s) from %s', name, version, shasum)

            download(path.join(dir, shasum), tarball, shasum, function (err) {
              if (err) {
                debug('%s@%s (%s) download failed: %s \n %s', name, version, shasum, err, err.stack)
                return cb(err)
              }

              // Use package.json from registry instead of the one supplied via
              // the tarball.
              fs.writeFile(
                path.join(dir, pkg.dist.shasum, '.package.json'),
                JSON.stringify(pkg, null, 2),
                cb
              )
            })
          },

          // Start installation of sub-dependencies.
          async.series.bind(null, [
            function (cb) {
              fs.mkdir(path.join(dir, pkg.dist.shasum, 'node_modules'), ignoreError('EEXIST', cb))
            },

            // Install dependencies in parallel.
            async.forEachOf.bind(
              null,
              assign({}, pkg.dependencies, pkg.peerDependencies),
              function (version, name, cb) {
                install(dir, name, version, _locks, function (err, dep) {
                  if (err) return cb(err)

                  var srcPath = path.join('..', '..', dep.dist.shasum, 'package')
                  var dstPath = path.join(dir, pkg.dist.shasum, 'node_modules', dep.name)

                  forceSymlink(srcPath, dstPath, cb)
                })
              }
            )
          ])

        ], function (err) {
          // Always release lock in case the user is messing with node_modules during install.
          delete _locks[pkg.dist.shasum]
          cb(err, pkg)
        })
      })
    }
  ], cb)
}

module.exports = install
