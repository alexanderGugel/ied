'use strict'

var gunzip = require('gunzip-maybe')
var tar = require('tar-fs')
var fs = require('fs')
var path = require('path')
var uuid = require('node-uuid')
var config = require('./config')

function write () {
  return fs.WriteStream(path.join(config.cacheDir, '.tmp', uuid()))
}

function read (uid) {
  return fs.ReadStream(path.join(config.cacheDir, uid))
}

function fetch (dest, uid, cb) {
  var untar = tar.extract(dest)
  read(uid).on('error', cb)
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
