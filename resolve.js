'use strict'

var http = require('http')
var semver = require('semver')
var async = require('async')
var log = require('a-logger')

function getJSON (url, cb) {
  http.get(url, function (res) {
    if (res.statusCode !== 200) {
      return cb(new Error('Unexpected status code: ' + res.statusCode))
    }

    var raw = ''

    res.on('data', function (chunk) { raw += chunk })
    res.on('end', function () {
      try {
        cb(null, JSON.parse(raw))
      } catch (e) {
        cb(e)
      }
    }).on('error', cb)
  }).on('error', cb)
}

var cachedGetJSON = async.memoize(getJSON)

/**
 * Resolves a dependency to an exact version.
 *
 * @param  {String}   name    The name of the dependency to be resolved, e.g.
 *                            `tape`.
 * @param  {String}   version The [semver](http://semver.org/) compatible
 *                            version string of the dependency, e.g. ``^5.0.1`.
 * @param  {Function} cb      Callback function to be executed on (successful)
 *                            resolution to an exact version number.
 */
function resolve (name, version, cb) {
  log.info('Resolving', name + '@' + version)

  cb = cb || function () {}

  cachedGetJSON('http://registry.npmjs.org/' + name, function (err, pkg) {
    if (err) return cb(err)
    var resolved = pkg.versions[semver.maxSatisfying(Object.keys(pkg.versions), version)]
    cb(resolved ? null : new Error('No satisfying target found for ' + name + '@' + version), resolved)
  })
}

module.exports = resolve

