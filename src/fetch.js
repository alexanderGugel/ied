'use strict'

var got = require('got')
var gunzip = require('gunzip-maybe')
var tar = require('tar-fs')
var crypto = require('crypto')
var fs = require('fs')
var path = require('path')
var debug = require('./debuglog')('fetch')
var progress = require('./progress')
var config = require('./config')
var cache = require('./cache')

function fetchFromRegistry (dest, tarball, uid, shasum, cb) {
  // Fixes flickering progress bar bug for sequential downloads.
  progress.start(1)

  // We need to map the filenames, otherwise we would get paths like
  // [shasum]/package, but we want [shasum] to be have whatever files
  // [package] contains
  var untar = tar.extract(dest, {strip: 1})

  // We verify the actual shasum to detect "corrupted" packages.
  var actualShasum = crypto.createHash('sha1')

  var stream = got.stream(tarball).on('response', function (res) {
    if (res.statusCode !== 200) {
      return cb(new Error('Unexpected status code ' + res.statusCode + ' for ' + tarball))
    }
    // Check if we know the final content-length. If we do, we can render a
    // progress bar.
    var hasContentLength = 'content-length' in res.headers
    if (hasContentLength) {
      progress.start(parseInt(res.headers['content-length'], 10))
      res.on('data', function (chunk) { progress.complete(chunk.length) })
    }
  })

  // Write to cache.
  var cached = stream.pipe(cache.write()).on('error', cb)

  stream.on('data', actualShasum.update.bind(actualShasum))
    .on('error', cb)
    .pipe(gunzip()).on('error', cb)
    .pipe(untar).on('error', cb)
    .on('finish', onFinish)

  function onFinish () {
    progress.complete(1)
    var expectedShasum = actualShasum.digest('hex')
    if (shasum && expectedShasum !== shasum) {
      debug('fetched tarball has incorrect shasum %s, expected %s', shasum, expectedShasum)
      return cb(new Error('Downloaded tarball has incorrect shasum'))
    }
    debug('cached %s in %s', uid, cached.path)
    return fs.rename(cached.path, path.join(config.cacheDir, uid), cb)
  }
}

// Fetches the specified tarball. Verifies the passed in shasum if not cached.
function fetch (dest, tarball, uid, shasum, cb) {
  cb = cb || function () {}

  debug('fetching %s from cache', uid)
  cache.fetch(dest, uid, function (err) {
    if (!err) return cb(null)
    if (err.code !== 'ENOENT') return cb(err)

    debug('%s not cached, fetching as %s into %s', tarball, uid, dest)
    fetchFromRegistry(dest, tarball, uid, shasum, cb)
  })
}

module.exports = fetch
