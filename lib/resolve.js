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

  if (pkg.type === 'range' || pkg.type === 'version' || pkg.type === 'tag') {
    resolveFromNpm(name, version, pkg, cb)
  } else if (pkg.type === 'remote') {
    resolveTarball(name, version, pkg.spec, cb)
  } else if (pkg.type === 'hosted') {
    resolveFromGithub(name, version, pkg.hosted, cb)
  } else {
    cb(new Error('Unknown package spec: ' + pkg.type + ' on ' + packageSpec))
  }
}

module.exports = resolve
