'use strict'

var gunzip = require('gunzip-maybe')
var tar = require('tar-fs')
var fs = require('fs')
var path = require('path')
var uuid = require('node-uuid')
var config = require('./config')
var mkdirp = require('mkdirp')

exports.write = write
function write () {
  return fs.WriteStream(path.join(config.cacheDir, '.tmp', uuid()))
}

exports.read = read
function read (uid) {
  return fs.ReadStream(path.join(config.cacheDir, uid))
}

exports.init = init
function init (cb) {
  mkdirp(path.join(config.cacheDir, '.tmp'), cb)
}

exports.fetch = fetch
function fetch (dest, uid, cb) {
  var untar = tar.extract(dest, { strip: 1 })
  read(uid).on('error', cb)
    .pipe(gunzip()).on('error', cb)
    .pipe(untar).on('error', cb)
    .on('finish', cb)
}
