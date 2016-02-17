'use strict'

var parsePackage = require('npm-package-arg')
var debug = require('./debuglog')('resolve')

var resolveFromNpm = require('./resolvers/npm-registry')
var resolveFromGithub = require('./resolvers/github')
var resolveTarball = require('./resolvers/tarball')

function resolve (name, version, cb) {
  debug('resolving %s@%s', name, version)

  cb = cb || function () {}
  var packageSpec = name + '@' + version
  var pkg = parsePackage(packageSpec)

  switch (pkg.type) {
    case 'range':
    case 'version':
    case 'tag':
      resolveFromNpm(name, version, pkg, cb)
      break
    case 'remote':
      resolveTarball(name, version, pkg.spec, cb)
      break
    case 'hosted':
      resolveFromGithub(name, version, pkg.hosted, cb)
      break
    default:
      cb(new Error('Unknown package spec: ' + pkg.type + ' on ' + packageSpec))
  }
}

module.exports = resolve
