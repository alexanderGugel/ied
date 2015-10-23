/* global describe it beforeEach */

var proxyquire = require('proxyquire')
var assert = require('assert')
var mock = require('mockmock')

describe('download', function () {
  var httpOn
  var http
  var gunzip
  var tar
  var download
  var dir = '/1/2/3'
  var tarball = 'http://example.com/test.tar'

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

    download = proxyquire('../lib/download', {
      http: http,
      'gunzip-maybe': gunzip,
      'tar-fs': tar
    })
  })

  it('should create tar stream', function () {
    var cb = mock()
    download(dir, tarball, cb)

    assert(tar.extract.called)
    assert.equal(tar.extract.args[0][0], dir)

    assert(typeof tar.extract.args[0][1], 'object')
    var tarMap = tar.extract.args[0][1].map
    assert.deepEqual(tarMap({ name: 'hello/world' }), { name: 'world' })
  })

  it('should fetch tarball', function () {
    var cb = mock()
    download(dir, tarball, cb)

    assert(http.get.called)
    assert.equal(http.get.args[0][0], tarball)
    var handler = http.get.args[0][1]

    handler({ statusCode: 500 })
    assert(cb.called)

    var res = { statusCode: 200 }
    res.pipe = mock(res)
    res.on = mock(res)

    handler(res)
    assert.equal(res.pipe.args[0][0], 'gunzip')
    assert.equal(res.pipe.args[1][0], 'tar.extract')
  })

  it('should accept optional callback function', function () {
    download(dir, tarball)
    assert.doesNotThrow(function () {
      httpOn.args[0][1]()
    })
  })
})
