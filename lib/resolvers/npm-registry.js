var semver = require('semver')
var got = require('got')
var url = require('url')
var packageUid = require('../util/package_uid')
var debug = require('../debuglog')('resolver:npm-registry')
var config = require('../config')

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

  got(url, {json: true, retries: config.requestRetries}, function (err, body, res) {
    if (err) {
      return cb(err)
    }
    if (res.statusCode !== 200) {
      cb(new Error('Unexpected status code ' + res.statusCode + ' for ' + url))
    }
    resolve(err, body)
    cache[url] = body
  })
}

module.exports = function resolveFromNpm (name, version, cb) {
  // Scoped module
  var isScopedModule = name.charAt(0) === '@'
  var escapedName = isScopedModule ? '@' + encodeURIComponent(name.substr(1)) : encodeURIComponent(name)

  fetch(url.resolve(config.registry, escapedName), function (err, pkg) {
    if (err) {
      debug('failed to resolve %s@%s: %s \n %s', name, version, err, err.stack)
      return cb(err)
    }
    if (!pkg.versions || typeof pkg.versions !== 'object') {
      return cb(new SyntaxError('package.json should have plain object property "versions"'))
    }
    var resolved = pkg.versions[semver.maxSatisfying(Object.keys(pkg.versions), version)]
    if (!resolved) {
      debug('no satisfying version found for %s@%s', name, version)
      return cb(new Error('No satisfying target found for ' + name + '@' + version), null)
    }
    debug('resolved %s@%s to %s@%s', name, version, resolved.name, resolved.version)
    cb(null, {
      name: resolved.name,
      version: resolved.version,
      uid: packageUid(name, version),
      shasum: resolved.dist.shasum,
      tarball: resolved.dist.tarball
    })
  })
}
