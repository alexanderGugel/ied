'use strict'

var semver = require('semver')
var needle = require('needle')
var url = require('url')
var debug = require('./debuglog')('registry')
var config = require('./config')
var download = require('./download')

var cache = Object.create(null)
var pending = Object.create(null)

function resolvePending (url, err, pkg) {
  while (pending[url].length) {
    (pending[url].pop())(err, pkg)
  }
}

function getJson (url, cb) {
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
  var options = {json: true, retries: config.requestRetries}

  needle.get(url, options, function (err, res) {
    if (err) {
      return cb(err)
    }
    if (res.statusCode !== 200) {
      cb(new Error('Unexpected status code ' + res.statusCode + ' for ' + url))
    }
    resolve(err, res.body)
    cache[url] = res.body
  })
}

function escapeName (name) {
  var isScopedModule = name.charAt(0) === '@'
  var escapedName = isScopedModule
    ? '@' + encodeURIComponent(name.substr(1))
    : encodeURIComponent(name)
  return escapedName
}

exports.resolve = resolve
function resolve (name, version, cb) {
  var escapedName = escapeName(name)

  getJson(url.resolve(config.registry, escapedName), function (err, result) {
    if (err) {
      debug('failed to resolve %s@%s: %s \n %s', name, version, err, err.stack)
      return cb(err)
    }

    var pkgJSON

    if (semver.validRange(version)) {
      if (typeof result.versions !== 'object') {
        cb(new SyntaxError('package root should have plain object property "versions"'))
        return
      }
      pkgJSON = result.versions[semver.maxSatisfying(Object.keys(result.versions), version)]
    } else {
      if (typeof result['dist-tags'] !== 'object') {
        cb(new SyntaxError('package root should have plain object property "dist-tags"'))
        return
      }
      pkgJSON = result.versions[result['dist-tags'][version]]
    }

    if (!pkgJSON) {
      debug('no satisfying target found for %s@%s', name, version)
      return cb(new Error('no satisfying target found for ' + name + '@' + version), null)
    }

    debug('resolved %s@%s to %s@%s', name, version, pkgJSON.name, pkgJSON.version)

    cb(null, {
      shasum: pkgJSON.dist.shasum,
      pkgJSON: pkgJSON,
      download: download.bind(null, pkgJSON.dist.tarball, pkgJSON.dist.shasum)
    })
  })
}
