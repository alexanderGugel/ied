'use strict'

var http = require('http')
var https = require('https')
var urlModule = require('url')
var semver = require('semver')
var util = require('util')
var config = require('./config')
var debug = util.debuglog('resolve')
var protocolToAgent = require('./protocol_to_agent')

var cache = Object.create(null)
var pending = Object.create(null)

function resolvePending (url, err, pkg) {
  while (pending[url].length) {
    (pending[url].pop())(err, pkg)
  }
}

function fetch (url, cb) {
  if (url in cache) {
    debug('using cached version of %s', url)
    cb(null, cache[url])
    return
  }

  if (url in pending) {
    pending[url].push(cb)
    return
  }

  debug('fetching %s', url)

  pending[url] = [cb]
  var resolve = resolvePending.bind(null, url)
  var opts = urlModule.parse(url)
  opts.agent = protocolToAgent[opts.protocol]
  if (!opts.agent) return cb(new Error(url + ' uses an unsupported protocol'))

  http.get(opts, function (res) {
    if (res.statusCode !== 200) {
      return cb(new Error('Unexpected status code ' + res.statusCode + ' for ' + url))
    }

    var raw = ''

    res.on('data', function (chunk) { raw += chunk })
    res.on('end', function () {
      try {
        var parsed = JSON.parse(raw)
        var err = null
        if (!parsed.versions || typeof parsed.versions !== 'object') {
          err = new SyntaxError('package.json should have plain object property "versions"')
        }
        if (!err) {
          cache[url] = parsed
        }
        resolve(err, parsed)
      } catch (e) {
        resolve(e)
      }
    })
    res.on('error', resolve)

  }).on('error', resolve)
}

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
  debug('resolving %s@%s', name, version)

  cb = cb || function () {}

  // Scoped module
  var escapedName = name.charAt(0) === '@' ? '@' + encodeURIComponent(name.substr(1)) : name

  fetch(config.registry + escapedName, function (err, pkg) {
    if (err) {
      debug('failed to resolve %s@%s: %s \n %s', name, version, err, err.stack)
      return cb(err)
    }
    var resolved = pkg.versions[semver.maxSatisfying(Object.keys(pkg.versions), version)]
    if (!resolved) {
      debug('no satisfying version found for %s@%s', name, version)
      return cb(new SyntaxError('No satisfying target found for ' + name + '@' + version), null)
    }
    debug('resolved %s@%s to %s@%s', name, version, resolved.name, resolved.version)
    cb(null, resolved)
  })
}

module.exports = resolve
