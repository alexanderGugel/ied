var zlib = require('zlib');
var peek = require('peek-stream')
var through = require('through2')
var pumpify = require('pumpify')

var isGzipped = function(data) {
  if (data.length < 10) return false // gzip header is 10 bytes
  if (data[0] !== 0x1f && data[1] !== 0x8b) return false // gzip magic bytes
  if (data[2] !== 8) return false // is deflating
  return true
}

var gunzip = function() {
  return peek({newline:false, maxBuffer:10}, function(data, swap) {
    swap(null, isGzipped(data) ? pumpify(zlib.createGunzip(), gunzip()) : through())
  })
}

module.exports = gunzip;