/* global describe it beforeEach */

'use strict'

var proxyquire = require('proxyquire')
var assert = require('assert')
var mock = require('mockmock')
var fs = require('fs')
var tmp = require('tmp')

describe('install', function () {
  var resolve
  var fetch
  var run
  var install
  var tmpDir
  var registryMock

  beforeEach(function () {
    tmpDir = tmp.dirSync().name
    resolve = mock(function (name, version, cb) {
      cb(null, {
        name: name,
        version: version,
        uid: name + '-' + version
      })
    })
    registryMock = {}
    fetch = mock(function (dest, tarball, uid, shasum, cb) {
      var err
      try {
        fs.writeFileSync(dest + '/package.json', JSON.stringify(registryMock[uid]), 'utf8')
      } catch (e) {
        err = e
      }
      cb(err)
    })
    run = mock(function (dir, pkg, cmd, cb) { cb(null) })
    install = proxyquire('../../lib/install', {
      './resolve': resolve,
      './run': run,
      './fetch': fetch
    })
  })

  it('should install package without dependencies', function (done) {
    registryMock['name-1.0.0'] = {
      dependencies: {}
    }
    install(tmpDir, 'name', '1.0.0', function (err) {
      assert.ifError(err)
      assert.equal(fetch.args[0][2], 'name-1.0.0')
      done()
    })
  })

  it('should handle different package versions in dependency tree', function (done) {
    registryMock['name-1.0.0'] = {
      dependencies: {
        child: '0.0.1',
        common: '1.0.0'
      }
    }
    registryMock['child-0.0.1'] = {
      dependencies: {
        common: '2.0.0'
      }
    }
    registryMock['common-1.0.0'] = {}
    registryMock['common-2.0.0'] = {}
    install(tmpDir, 'name', '1.0.0', function (err) {
      assert.ifError(err)
      assert.equal(fetch.args[0][2], 'name-1.0.0')
      assert.equal(fetch.args[1][2], 'child-0.0.1')
      assert.equal(fetch.args[2][2], 'common-1.0.0')
      assert.equal(fetch.args[3][2], 'common-2.0.0')
      done()
    })
  })

  it('should invoke post installation scripts', function (done) {
    registryMock['name-1.0.0'] = {
      dependencies: {},
      scripts: {
        install: 'echo "installed"'
      }
    }
    install(tmpDir, 'name', '1.0.0', function (err) {
      assert.ifError(err)
      assert.deepEqual(run.args.length, 1)
      done()
    })
  })
})
