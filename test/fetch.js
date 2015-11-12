/* global describe it beforeEach */

var proxyquire = require('proxyquire')
var assert = require('assert')
var mock = require('mockmock')

describe('fetch', function () {
  var httpOn
  var http
  var gunzip
  var tar
  var fetch
  var dir = '/1/2/3'
  var tarball = 'http://example.com/test.tar'
  var shasum = '123'

  beforeEach(function () {
    httpOn = mock()
    http = {
      get: mock(function () {
        return {
          on: httpOn
        }
      })
    }

    gunzip = mock('gunzip')
    tar = { extract: mock('tar.extract') }

    fetch = proxyquire('../lib/fetch', {
      http: http,
      'gunzip-maybe': gunzip,
      'tar-fs': tar
    })
  })

  it('should create tar stream', function () {
    var cb = mock()
    fetch(dir, tarball, shasum, cb)

    assert(tar.extract.called)
    assert.equal(tar.extract.args[0][0], dir)

    assert(typeof tar.extract.args[0][1], 'object')
  })

  it('should fetch tarball', function () {
    var cb = mock()
    fetch(dir, tarball, shasum, cb)

    assert(http.get.called)
    assert.equal(http.get.args[0][0], tarball)
    var handler = http.get.args[0][1]

    handler({ statusCode: 500, headers: {} })
    assert(cb.called)

    var res = { statusCode: 200, headers: {} }
    res.pipe = mock(res)
    res.on = mock(res)

    handler(res)
    assert.equal(res.pipe.args[0][0], 'gunzip')
    assert.equal(res.pipe.args[1][0], 'tar.extract')
  })

  it('should accept optional callback function', function () {
    fetch(dir, tarball, shasum)
    assert.doesNotThrow(function () {
      httpOn.args[0][1]()
    })
  })

  it('should handle multiple pending requests', function () {
    var cb1 = mock()
    var cb2 = mock()

    fetch(dir, tarball, shasum, cb1)
    fetch(dir, tarball, shasum, cb2)

    assert.equal(http.get.callCount, 2)
    assert.equal(http.get.args[0][0], tarball)

    var handler1 = http.get.args[0][1]
    handler1({ statusCode: 500, headers: {} })

    var handler2 = http.get.args[1][1]
    handler2({ statusCode: 500, headers: {} })

    assert(cb1.called)
    assert(cb2.called)
  })
})
