/* global describe it beforeEach */

'use strict'

var proxyquire = require('proxyquire')
var assert = require('assert')
var mock = require('mockmock')

describe('install', function () {
  var forceSymlink
  var resolve
  var fetch
  var install
  var cb

  beforeEach(function () {
    forceSymlink = mock()
    resolve = mock()
    fetch = mock()
    cb = mock()

    install = proxyquire('../../lib/install', {
      'force-symlink': forceSymlink,
      './resolve': resolve,
      './fetch': fetch
    })
  })

  it('should resolve correct package', function () {
    install('/somewhere/', 'name', '~1.0.0', false, cb)
    assert.deepEqual(resolve.args[0].slice(0, 2), ['name', '~1.0.0'])
  })
})
