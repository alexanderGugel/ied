'use strict'

var http = require('http')
var gunzip = require('gunzip-maybe')
var tar = require('tar-fs')
var crypto = require('crypto')
var util = require('util')
var fs = require('fs')
var path = require('path')
var after = require('after')
var debug = util.debuglog('fetch')
var progress = require('./progress')
var config = require('./config')
var cache = require('./cache')

function fetchFromRegistry (dest, tarball, shasum, cb) {
  // Fixes flickering progress bar bug for sequential downloads.
  progress.start(1)

  cb = after(2, cb)

  // We need to map the filenames, otherwise we would get paths like
  // [shasum]/package, but we want [shasum] to be have whatever files
  // [package] contains
  var untar = tar.extract(dest)

  // We verify the actual shasum to detect "corrupted" packages.
  var actualShasum = crypto.createHash('sha1')

  http.get(tarball, function (res) {
    if (res.statusCode !== 200) {
      return cb(new Error('Unexpected status code ' + res.statusCode + ', expected 200'))
    }

    // Write to cache.
    res.pipe(cache.write())
      .on('error', cb)
      .on('close', function () {
        debug('cached %s in %s', shasum, this.path)
        fs.rename(this.path, path.join(config.cacheDir, shasum), cb)
      })

    // Check if we know the final content-length. If we do, we can render a
    // progress bar.
    var hasContentLength = 'content-length' in res.headers
    if (hasContentLength) {
      progress.start(parseInt(res.headers['content-length'], 10))
      res.on('data', function (chunk) { progress.complete(chunk.length) })
    }

    function onFinish () {
      progress.complete(1)
      var expectedShasum = actualShasum.digest('hex')
      if (expectedShasum === shasum) return cb(null)
      debug('fetched tarball has incorrect shasum %s, expected %s', shasum, expectedShasum)
      cb(new Error('Downloaded tarball has incorrect shasum'))
    }

    // Used for progress indicator.
    res.on('data', actualShasum.update.bind(actualShasum))

    res.on('error', cb)
      .pipe(gunzip()).on('error', cb)
      .pipe(untar).on('error', cb)
      .on('finish', onFinish)
  }).on('error', cb)
}

// Fetches the specified tarball. Verifies the passed in shasum if not cached.
function fetch (dest, tarball, shasum, cb) {
  cb = cb || function () {}

  debug('fetching %s from cache', shasum)
  cache.fetch(dest, shasum, function (err) {
    if (!err) return cb(null)
    if (err.code !== 'ENOENT') return cb(err)

    debug(' %s not cached, fetching as %s into %s', tarball, shasum, dest)
    fetchFromRegistry(dest, tarball, shasum, cb)
  })
}

module.exports = fetch
