'use strict'

var fs = require('fs')
var forceSymlink = require('./force_symlink')
var async = require('async')
var path = require('path')
var resolve = require('./resolve')
var download = require('./download')
var log = require('a-logger')
var assign = require('object-assign')
var ignoreError = require('./ignore_error')

/**
 * Recursively installs a dependency.
 *
 * @param  {String}   name    The name of the dependency to be installed, e.g.
 *                            `tape`.
 * @param  {String}   version The [semver](http://semver.org/) compatible
 *                            version string of the dependency, e.g. ``^5.0.1`.
 * @param {Boolean} entry     Boolean value indicating whether this is an
 *                            `entry` dependency. Entry dependencies can be
 *                            `require`d. Their `bin` scripts are symlinked as
 *                            `dir/.bin/[name]`.
 * @param {Function} cb       Callback function to be executed as soon as the
 *                            installation of the package and all consecutive
 *                            dependencies has been compvared.
 */
function install (dir, name, version, entry, cb) {
  log.info('Installing', name + '@' + version, 'into', path.relative(process.cwd(), dir))

  cb = cb || function () {}

  async.waterfall([

    // Resolve dependency to a package.json file.
    resolve.bind(null, name, version),

    function (pkg, cb) {
      fs.mkdir(path.join(dir, pkg.dist.shasum), function (err) {
        // If the dependency has already been installed (= shasum dir exists),
        // we abort the installation procedure.
        if (err && err.code === 'EEXIST') {
          log.info(
            name + '@' + version, 'already installed.',
            'Skipping download and installation phase.'
          )
          return cb(null, pkg)
        }

        // If there is still an error, something unexpected happened.
        if (err) return cb(err, pkg)

        async.parallel([
          function (cb) {
            download(path.join(dir, pkg.dist.shasum), pkg, function (err) {
              if (err) return cb(err)

              // Use package.json from registry instead of the one supplied via
              // the tarball.
              fs.writeFile(
                path.join(dir, pkg.dist.shasum, 'package.json'),
                JSON.stringify(pkg, null, 2),
                cb
              )
            })
          },

          // Start installation of further dependencies.
          async.series.bind(null, [
            function (cb) {
              fs.mkdir(path.join(dir, pkg.dist.shasum, 'node_modules'), ignoreError('EEXIST', cb))
            },

            // Install dependencies in parallel.
            async.forEachOf.bind(
              null,
              assign({}, pkg.dependencies, pkg.peerDependencies),
              function (version, name, cb) {
                install(dir, name, version, false, function (err, dep) {
                  if (err) return cb(err)

                  var srcPath = path.join('..', '..', dep.dist.shasum)
                  var dstPath = path.join(dir, pkg.dist.shasum, 'node_modules', dep.name)
                  forceSymlink(srcPath, dstPath, cb)
                })
              }
            )
          ])

        ], function (err) {
          cb(err, pkg)
        })
      })
    },

    function (pkg, cb) {
      if (!entry) return cb(null, pkg)

      symlinkEntry(dir, name, pkg, function (err) {
        cb(err, pkg)
      })
    }
  ], cb)
}

function symlinkEntry (dir, name, pkg, cb) {
  async.parallel([

    // Finally symlink if dependency is being installed as an entry.
    // Entry dependencies can be required by their name.

    function (cb) {
      var srcPath = pkg.dist.shasum
      var dstPath = path.join(dir, name)
      forceSymlink(srcPath, dstPath, cb)
    },

    // Link all scripts.

    function (cb) {
      var bin

      if (typeof pkg.bin === 'string') {
        bin = {}
        bin[pkg.name] = pkg.bin
      } else {
        bin = pkg.bin
      }

      async.forEachOf(bin, function (pathname, name, cb) {
        var srcPath = path.join('..', pkg.dist.shasum, pathname)
        var dstPath = path.join(dir, '.bin', name)

        forceSymlink(srcPath, dstPath, cb)
      }, cb)
    }
  ], cb)
}

module.exports = install
