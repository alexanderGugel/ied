'use strict'

var gunzip = require('gunzip-maybe')
var tar = require('tar-fs')
var fs = require('fs')
var path = require('path')
var uuid = require('node-uuid')
var config = require('./config')

function write () {
  return fs.WriteStream(path.join(config.tmpDir, uuid()))
}

function read (shasum) {
  return fs.ReadStream(path.join(config.cacheDir, shasum))
}

function fetch (dest, shasum, cb) {
  var untar = tar.extract(dest)
  read(shasum).on('error', cb)
    .pipe(gunzip()).on('error', cb)
    .pipe(untar).on('error', cb)
    .on('finish', cb)
}

var cache = {
  read: read,
  write: write,
  fetch: fetch
}

module.exports = cache
