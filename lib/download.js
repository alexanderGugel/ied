'use strict'

const http = require('http')
const gunzip = require('gunzip-maybe')
const tar = require('tar-fs')
const path = require('path')
const log = require('a-logger')

/**
 * Downloads and decodes a dependency.
 *
 * @param  {String}   dir  Pathname of directory dir to put downloaded
 *                          dependency into.
 * @param  {Object}   pkg  `package.json` of dependency encoded as an object.
 * @param  {Function} cb    Callback function to be executed when download is
 *                          complete.
 */
function download (dir, pkg, cb) {
  log.info('Downloading', pkg.dist.tarball, 'into', path.relative(process.cwd(), dir))

  cb = cb || function () {}

  http.get(pkg.dist.tarball, function (res) {
    if (res.statusCode !== 200) {
      return cb(new Error('Invalid status code ' + res.statusCode + ', expected 200'))
    }

    res.pipe(gunzip()).pipe(tar.extract(dir, {
      map: function (header) {
        header.name = header.name.split('/').slice(1).join('/')
        return header
      }

    })).on('finish', cb).on('error', cb)
  }).on('error', cb)
}

module.exports = download
