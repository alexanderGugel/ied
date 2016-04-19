'use strict'

var url = require('url')
var debug = require('./debuglog')('resolve')

var registry = require('./registry')
var resolveTarball = require('./resolvers/tarball')

function resolve (name, version, cb) {
  debug('resolving %s@%s', name, version)

  cb = cb || function () {}
  const protocol = url.parse(version).protocol

  switch (protocol) {
    case 'http':
    case 'https':
      resolveTarball(name, version, pkg.spec, cb)
      break
    default:
      registry.resolve(name, version, cb)
  }
}

module.exports = resolve
