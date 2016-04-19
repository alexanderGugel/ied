'use strict'

var needle = require('needle')
var gunzip = require('gunzip-maybe')
var tar = require('tar-fs')
var crypto = require('crypto')
var fs = require('fs')
var path = require('path')
var debug = require('./debuglog')('fetch')
var config = require('./config')
var cache = require('./cache')

function fetchFromRegistry (dest, tarball, uid, shasum, cb) {
  // We need to map the filenames, otherwise we would get paths like
  // [shasum]/package, but we want [shasum] to be have whatever files
  // [package] contains
  var untar = tar.extract(dest, {strip: 1})

  // We verify the actual shasum to detect "corrupted" packages.
  var actualShasum = crypto.createHash('sha1')

  // Start the actual download.
  var stream = needle.get(tarball)

  // Write to cache.
  var cached = stream.pipe(cache.write()).on('error', cb)

  stream
    .on('data', actualShasum.update.bind(actualShasum)).on('error', cb)
    .pipe(gunzip()).on('error', cb)
    .pipe(untar).on('error', cb)
    .on('finish', handleFinish)

  function handleFinish () {
    var expectedShasum = actualShasum.digest('hex')
    if (shasum && expectedShasum !== shasum) {
      debug('fetched tarball has incorrect shasum %s, expected %s', shasum, expectedShasum)
      return cb(new Error('corrupted download ' + shasum + ' from ' + tarball))
    }
    debug('cached %s in %s', uid, cached.path)
    return fs.rename(cached.path, path.join(config.cacheDir, uid), cb)
  }
}

// Fetche the specified tarball. Verify the passed in shasum if not cached.
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
