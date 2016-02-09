/* global describe it beforeEach */

'use strict'

var proxyquire = require('proxyquire')
var assert = require('assert')
var mock = require('mockmock')

describe('cache', function () {
  var cache
  var config
  var fs
  var uuid
  var tar

  beforeEach(function () {
    config = {}
    fs = {}
    tar = {}
    cache = proxyquire('../../lib/cache', {
      './config': config,
      fs: fs,
      'node-uuid': function () {
        return uuid
      },
      tar: tar
    })
  })

  describe('read', function () {
    it('should open ReadStream to specified ui directory', function (done) {
      config.cacheDir = 'some/dir'
      fs.ReadStream = mock(function (path) {
        assert.equal(path, 'some/dir/123')
        done()
      })
      cache.read('123')
    })

    it('should return ReadStream', function () {
      var readStream = {}
      fs.ReadStream = mock(function () {
        return readStream
      })
      assert.equal(cache.read('some/where'), readStream)
    })
  })

  describe('write', function () {
    it('should open WriteStream to random uuid directory', function (done) {
      config.cacheDir = 'some/dir'
      uuid = 'some-uuid'
      fs.WriteStream = mock(function (path) {
        assert.equal(path, 'some/dir/.tmp/some-uuid')
        done()
      })
      cache.write()
    })

    it('should return WriteStream', function () {
      var writeStream = {}
      fs.WriteStream = mock(function () {
        return writeStream
      })
      assert.equal(cache.write(), writeStream)
    })
  })
})
