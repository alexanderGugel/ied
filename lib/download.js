'use strict'

var http = require('http')
var gunzip = require('gunzip-maybe')
var tar = require('tar-fs')

function map (header) {
  header.name = header.name.split('/').slice(1).join('/')
  return header
}

/**
 * Downloads and decodes a dependency.
 *
 * @param  {String}   dir     Pathname of directory dir to put downloaded
 *                            dependency into.
 * @param  {String}   tarball tarball to be downloaded.
 * @param  {Function} cb      Callback function to be executed when download is
 *                            complete.
 */
function download (dir, tarball, cb) {
  cb = cb || function () {}

  var untar = tar.extract(dir, {
    map: map
  })

  http.get(tarball, function (res) {
    if (res.statusCode !== 200) {
      return cb(new Error('Invalid status code ' + res.statusCode + ', expected 200'))
    }

    res
      .pipe(gunzip())
      .pipe(untar)
      .on('finish', cb)
      .on('error', cb)
  }).on('error', cb)
}

module.exports = download
