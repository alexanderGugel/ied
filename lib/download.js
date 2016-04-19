'use strict'

var gunzip = require('gunzip-maybe')
var tar = require('tar-fs')
var crypto = require('crypto')
var needle = require('needle')
var fs = require('fs')
var debug = require('./debuglog')('download')
var path = require('path')
var cache = require('./cache')
var config = require('./config')

module.exports = download
function download (tarball, shasum, dest, cb) {
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
    debug('cached %s in %s', shasum, cached.path)
    return fs.rename(cached.path, path.join(config.cacheDir, shasum), cb)
  }
}
