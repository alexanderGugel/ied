/* global describe it beforeEach */

var _ = require('lodash')
var proxyquire = require('proxyquire')
var assert = require('assert')
var mock = require('mockmock')
var EventEmitter = require('events').EventEmitter
var config = require('../../lib/config')

describe('resolve', function () {
  var protocols = ['http', 'https']
  protocols.forEach(function (protocol) {
    describe(protocol, function () {
      var http
      var cb
      var httpResp
      var httpGet
      var resolve
      beforeEach(function () {
        httpResp = new EventEmitter()
        httpGet = new EventEmitter()
        http = { get: mock(httpGet) }
        var dummyConfig = _.clone(config)
        dummyConfig.registry = protocol + '://registry.npmjs.org/'
        cb = mock()

        resolve = proxyquire('../../lib/resolve', {
          './config': dummyConfig,
          http: http,
          https: http
        })
      })

      it('should fetch from correct endpoint', function () {
        var name = 'some-package'
        var version = '~1.0.0'
        resolve(name, version, cb)

        assert.deepEqual(http.get.args[0][0], protocol + '://registry.npmjs.org/' + name)
      })

      it('should accept optional callback', function () {
        var err = new Error()
        resolve('some-package', '~1.0.0')

        assert.doesNotThrow(function () {
          httpGet.emit('error', err)
        })
      })

      it('should handle HTTP connection error', function () {
        var err = new Error()
        resolve('some-package', '~1.0.0', cb)
        httpGet.emit('error', err)
        assert.equal(cb.args[0][0], err)
      })

      it('should handle HTTP error while receiving data', function () {
        var err = new Error()
        resolve('some-package', '~1.0.0', cb)
        httpResp.statusCode = 200
        http.get.args[0][1](httpResp)
        httpResp.emit('data', 'some data')
        httpResp.emit('error', err)
        assert.equal(cb.args[0][0], err)
      })

      it('should handle invalid statusCode', function () {
        resolve('some-package', '~1.0.0', cb)
        httpResp.statusCode = 404
        http.get.args[0][1](httpResp)
        httpResp.emit('data', '{}')
        httpResp.emit('end')
        assert(cb.args[0][0])
      })

      it('should handle invalid JSON response', function () {
        resolve('some-package', '~1.0.0', cb)
        httpResp.statusCode = 200
        http.get.args[0][1](httpResp)
        httpResp.emit('data', 'some data')
        httpResp.emit('data', 'some more data')
        httpResp.emit('end')
        assert(cb.args[0][0] instanceof SyntaxError)
      })

      it('should validate JSON response schema to have plain object property "versions', function () {
        resolve('some-package', '~1.0.0', cb)
        httpResp.statusCode = 200
        http.get.args[0][1](httpResp)
        httpResp.emit('data', JSON.stringify({
          versions: []
        }))
        httpResp.emit('end')
        assert(cb.args[0][0] instanceof SyntaxError)
      })

      it('should handle case of no matching version', function () {
        resolve('some-package', '~5.0.0', cb)
        httpResp.statusCode = 200
        http.get.args[0][1](httpResp)
        httpResp.emit('data', JSON.stringify({
          versions: {
            '0.0.1': {},
            '1.0.0': {},
            '2.0.0': {}
          }
        }))
        httpResp.emit('end')
        assert(cb.args[0][0] instanceof Error)
      })

      it('should resolve to latest correct version', function () {
        resolve('some-package', '~1.1.0', cb)
        httpResp.statusCode = 200
        http.get.args[0][1](httpResp)
        httpResp.emit('data', JSON.stringify({
          versions: {
            '0.0.1': { version: '0.0.1' },
            '1.0.0': { version: '1.0.0' },
            '1.1.0': { version: '1.1.0' },
            '2.0.0': { version: '2.0.0' }
          }
        }))
        httpResp.emit('end')
        assert.ifError(cb.args[0][0])
        assert.deepEqual(cb.args[0][1], { version: '1.1.0' })
      })

      it('should properly handle pending requests', function () {
        var cb2 = mock()

        resolve('some-package', '~1.1.0', cb)
        resolve('some-package', '~2.0.0', cb2)

        httpResp.statusCode = 200
        http.get.args[0][1](httpResp)

        httpResp.emit('data', JSON.stringify({
          versions: {
            '0.0.1': { version: '0.0.1' },
            '1.0.0': { version: '1.0.0' },
            '1.1.0': { version: '1.1.0' },
            '2.0.0': { version: '2.0.0' }
          }
        }))
        httpResp.emit('end')

        assert.ifError(cb.args[0][0])
        assert.ifError(cb2.args[0][0])
        assert.deepEqual(cb.args[0][1], { version: '1.1.0' })
        assert.deepEqual(cb2.args[0][1], { version: '2.0.0' })
      })

      it('should properly cache requests', function () {
        resolve('some-package', '~1.1.0', cb)

        httpResp.statusCode = 200
        http.get.args[0][1](httpResp)

        httpResp.emit('data', JSON.stringify({
          versions: {
            '0.0.1': { version: '0.0.1' },
            '1.0.0': { version: '1.0.0' },
            '1.1.0': { version: '1.1.0' },
            '2.0.0': { version: '2.0.0' }
          }
        }))
        httpResp.emit('end')

        assert.ifError(cb.args[0][0])
        assert.deepEqual(cb.args[0][1], { version: '1.1.0' })

        var cb2 = mock()
        resolve('some-package', '~2.0.0', cb2)

        assert.ifError(cb2.args[0][0])
        assert.deepEqual(cb2.args[0][1], { version: '2.0.0' })

        assert.equal(cb.called, 1)
        assert.equal(cb2.called, 1)
      })
    })
  })
})
