/* global describe it beforeEach */

var assign = require('object-assign')
var proxyquire = require('proxyquire')
var assert = require('assert')
var mock = require('mockmock')
var EventEmitter = require('events').EventEmitter
var config = require('../../lib/config')

describe('resolve', function () {
  describe('npm-registry', function () {
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
          http = {
            get: mock(httpGet),
            '@global': true
          }
          var dummyConfig = assign({}, config)
          dummyConfig['@global'] = true
          dummyConfig.registry = protocol + '://registry.npmjs.org/'
          cb = mock()

          resolve = proxyquire('../../lib/resolve', {
            '../config': dummyConfig,
            http: http,
            https: http
          })
        })

        it('should fetch from correct endpoint', function () {
          var name = 'some-package'
          var version = '~1.0.0'
          resolve(name, version, cb)

          assert.deepEqual(http.get.args[0][0].href, protocol + '://registry.npmjs.org/' + name)
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
            versions: null
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
              '1.1.0': { version: '1.1.0', dist: {} },
              '2.0.0': { version: '2.0.0' }
            }
          }))
          httpResp.emit('end')
          assert.ifError(cb.args[0][0])
          assert.deepEqual(cb.args[0][1].version, '1.1.0')
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
              '1.1.0': { version: '1.1.0', dist: {} },
              '2.0.0': { version: '2.0.0', dist: {} }
            }
          }))
          httpResp.emit('end')

          assert.ifError(cb.args[0][0])
          assert.ifError(cb2.args[0][0])
          assert.deepEqual(cb.args[0][1].version, '1.1.0')
          assert.deepEqual(cb2.args[0][1].version, '2.0.0')
        })

        it('should properly cache requests', function () {
          resolve('some-package', '~1.1.0', cb)

          httpResp.statusCode = 200
          http.get.args[0][1](httpResp)

          httpResp.emit('data', JSON.stringify({
            versions: {
              '0.0.1': { version: '0.0.1' },
              '1.0.0': { version: '1.0.0' },
              '1.1.0': { version: '1.1.0', dist: {} },
              '2.0.0': { version: '2.0.0', dist: {} }
            }
          }))
          httpResp.emit('end')

          assert.ifError(cb.args[0][0])
          assert.deepEqual(cb.args[0][1].version, '1.1.0')

          var cb2 = mock()
          resolve('some-package', '~2.0.0', cb2)

          assert.ifError(cb2.args[0][0])
          assert.equal(cb2.args[0][1].version, '2.0.0')

          assert.equal(cb.called, 1)
          assert.equal(cb2.called, 1)
        })
      })
    })
  })

  describe('tarball', function () {
    var resolve

    beforeEach(function () {
      resolve = require('../../lib/resolve')
    })

    it('should resolve packages as tarball direct link', function (done) {
      resolve('some-package', 'http://my-site.com/package.tgz', function (err, pkg) {
        assert.ifError(err)
        assert.deepEqual(pkg, {
          name: 'some-package',
          version: 'http://my-site.com/package.tgz',
          uid: '9ef3db4e5617178060a68c22042b40bed66dffab',
          shasum: null,
          tarball: 'http://my-site.com/package.tgz'
        })
        done()
      })
    })
  })

  describe('errors', function () {
    var resolve

    beforeEach(function () {
      resolve = require('../../lib/resolve')
    })

    it('should report that github is not supported now', function (done) {
      resolve('some-package', 'alexanderGugel/ied', function (err) {
        assert(err)
        done()
      })
    })

    it('should throw on unknown version spec', function (done) {
      resolve('some-package', 'unknown spec', function (err) {
        assert(err)
        done()
      })
    })
  })
})
