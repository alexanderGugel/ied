'use strict'

var fs = require('fs')
var async = require('async')
var path = require('path')
var resolve = require('./resolve')
var download = require('./download')
var log = require('a-logger')
var assign = require('object-assign')

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
 *                            dependencies has been completed.
 */
function install (name, version, dir, entry, cb) {
  log.info('Installing', name + '@' + version, 'into', path.relative(process.cwd(), dir))

  cb = cb || function () {}

  async.waterfall([

    // Resolve dependency to a package.json file.
    resolve.bind(null, name, version),

    function (pkg, cb) {
      fs.mkdir(path.join(dir, pkg.dist.shasum), function (err) {

        // If the dependency has already been installed (= shasum dir exists),
        // we abort the installation procedure.
        if (err) return cb(err.code === 'EEXIST' ? null : err, pkg)

        async.parallel([

          async.series.bind(null, [
            download.bind(null, path.join(dir, pkg.dist.shasum), pkg),

            // Use package.json from registry instead of the one supplied via the
            // tarball.
            fs.writeFile.bind(
              null,
              path.join(dir, pkg.dist.shasum, 'package.json'),
              JSON.stringify(pkg, null, 2)
            )
          ]),

          async.series.bind(null, [
            fs.mkdir.bind(null, path.join(dir, pkg.dist.shasum, 'node_modules')),

            // Install dependencies in parallel.
            async.forEachOf.bind(
              null,
              assign({}, pkg.dependencies, pkg.peerDependencies),
              function (version, name, cb) {
                install(name, version, dir, false, function (err, dep) {
                  if (err) return cb(err)
                  var srcPath = path.join('..', '..', dep.dist.shasum)
                  var dstPath = path.join(dir, pkg.dist.shasum, 'node_modules', dep.name)
                  fs.symlink(srcPath, dstPath, cb)
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

      async.parallel([

        // Finally symlink if dependency is being installed as an entry.
        // Entry dependencies can be required by their name.
        // TODO Handle EEXIST
        fs.symlink.bind(null, pkg.dist.shasum, path.join(dir, name)),

        // Link all scripts.
        function (cb) {
          var bin = pkg.bin

          if (typeof bin === 'string') {
            bin = {}
            bin[pkg.name] = pkg.bin
          }
          bin = bin || {}

          async.forEachOf(bin, function (pathname, name, cb) {
            // TODO Handle EEXIST
            fs.symlink(
              path.join('..', pkg.dist.shasum, pathname),
              path.join(dir, '.bin', name),
              cb
            )
          }, cb)
        }

      ], function (err) {
        cb(err, pkg)
      })

    }
  ], cb)
}

module.exports = install
