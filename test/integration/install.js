/* global describe it before */

var install = require('../../lib/install')
var rimraf = require('rimraf')
var path = require('path')
var assert = require('assert')
var mkdirp = require('mkdirp')
var semver = require('semver')
var config = require('../../lib/config')

describe('install', function () {
  this.timeout(0)

  var node_modules = path.join(__dirname, 'node_modules')

  var scenarios = [
    { name: 'browserify', version: '12.0.1' },
    { name: 'tape', version: '4.2.2' },
    { name: 'express', version: '4.13.3' },
    { name: 'mocha', version: '2.3.4' },
    { name: 'lodash', version: '3.10.1' },
    { name: 'gulp', version: '3.9.0' },
    { name: 'grunt', version: '0.3.1' }
  ]

  function reset (done) {
    rimraf(node_modules, function (err) {
      done(err && err.code !== 'ENOTDIR' ? err : null)
    })
  }

  before(reset)

  before(mkdirp.bind(null, path.join(node_modules, '.bin')))
  before(mkdirp.bind(null, path.join(config.cacheDir, '.tmp')))

  scenarios.forEach(function (scenario) {
    var name = scenario.name
    var version = scenario.version

    it('should install ' + name + '@' + version, function (done) {
      install(node_modules, name, version, function (err, pkg) {
        assert.ifError(err)
        assert(pkg.name, name)
        require(path.join(pkg.dist.shasum, 'package'))
        var actualVersion = require(path.join(pkg.dist.shasum, 'package', 'package.json')).version
        assert(semver.satisfies(actualVersion, version), actualVersion + ' should satisfy' + version)
        done()
      })
    })
  })
})
