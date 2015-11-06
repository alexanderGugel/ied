'use strict'

var http = require('http')
var gunzip = require('gunzip-maybe')
var tar = require('tar-fs')
var crypto = require('crypto')
var util = require('util')
var debug = util.debuglog('download')
var progress = require('./progress')

var pending = Object.create(null)

function resolvePending (shasum, err) {
  while (pending[shasum].length) {
    (pending[shasum].pop())(err)
  }
}

function map (header) {
  header.name = header.name.split('/').slice(1).join('/')
  return header
}

/**
 * Downloads and decodes a dependency.
 *
 * @param  {String}   path    Pathname of the directory to put the downloaded
 *                            dependency into.
 * @param  {String}   tarball URL of tarball to be downloaded.
 * @param  {String}   shasum  Expected SHA-1 checksum of the dependency.
 * @param  {Function} cb      Callback function to be executed when download is
 *                            complete.
 */
function download (path, tarball, shasum, cb) {
  debug('downloading %s as %s into %s', tarball, shasum, path)

  cb = cb || function () {}

  if (shasum in pending) {
    pending[shasum].push(cb)
    return
  }

  pending[shasum] = [cb]
  var resolve = resolvePending.bind(null, shasum)

  // We need to map the filenames, otherwise we would get paths like
  // [shasum]/package, but we want [shasum] to be have whatever files
  // [package] contains
  var untar = tar.extract(path, {
    map: map
  })

  progress.start()
  http.get(tarball, function (res) {
    if (res.statusCode !== 200) {
      progress.complete()
      debug('got unexpected status code %s from registry when downloading %s, expected 200', res.statusCode, tarball)
      resolve(new Error('Unexpected status code ' + res.statusCode + ', expected 200'))
      return
    }

    var actualShasum = crypto.createHash('sha1')

    res.on('data', function (chunk) {
      actualShasum.update(chunk)
    })

    res
      .pipe(gunzip())
      .pipe(untar)
      .on('finish', function () {
        progress.complete()
        var expectedShasum = actualShasum.digest('hex')
        if (shasum && expectedShasum !== shasum) {
          debug('downloaded tarball has incorrect shasum %s, expected %s', shasum, expectedShasum)
          resolve(new Error('Downloaded tarball has incorrect shasum'))
          return
        }
        resolve()
      })
      .on('error', resolve)
  }).on('error', resolve)
}

module.exports = download
