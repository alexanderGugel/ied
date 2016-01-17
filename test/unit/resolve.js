/* global describe it before after beforeEach afterEach */

var assign = require('object-assign')
var proxyquire = require('proxyquire')
var assert = require('assert')
var nock = require('nock')
var config = require('../../lib/config')

describe('resolve', function () {
  before(function () {
    nock.disableNetConnect()
  })
  after(function () {
    nock.enableNetConnect()
  })

  describe('npm-registry', function () {
    var protocols = ['http', 'https']
    protocols.forEach(function (protocol) {
      describe(protocol, function () {
        var server
        var resolve
        beforeEach(function () {
          var dummyConfig = assign({}, config)
          dummyConfig['@global'] = true
          dummyConfig.requestRetries = 0
          dummyConfig.registry = protocol + '://registry.npmjs.org/'
          server = nock(dummyConfig.registry)

          resolve = proxyquire('../../lib/resolve', {
            '../config': dummyConfig
          })
        })

        afterEach(function () {
          server.done()
        })

        it('should accept optional callback', function () {
          var err = new Error()
          server.get('/some-package').replyWithError(err)
          resolve('some-package', '~1.0.0')
        })

        it('should handle HTTP connection error', function (done) {
          var err = new Error('Some request error')
          server.get('/some-package').replyWithError(err)
          resolve('some-package', '~1.0.0', function (requestError) {
            assert.equal(requestError.message, err.message)
            done()
          })
        })

        it('should handle invalid statusCode', function (done) {
          server.get('/some-package').reply(404, 'package not found')
          resolve('some-package', '~1.0.0', function (err) {
            assert(err)
            done()
          })
        })

        it('should handle invalid JSON response', function (done) {
          server.get('/some-package').reply(200, 'invalid payload')
          resolve('some-package', '~1.0.0', function (err) {
            assert.equal(err.name, 'ParseError')
            done()
          })
        })

        it('should validate JSON response schema to have plain object property "versions', function (done) {
          server.get('/some-package').reply(200, {
            versions: null
          })
          resolve('some-package', '~1.0.0', function (err) {
            assert(err instanceof SyntaxError)
            done()
          })
        })

        it('should handle case of no matching version', function (done) {
          server.get('/some-package').reply(200, {
            versions: {
              '0.0.1': {},
              '1.0.0': {},
              '2.0.0': {}
            }
          })
          resolve('some-package', '~5.0.0', function (err) {
            assert(err instanceof Error)
            done()
          })
        })

        it('should resolve to latest correct version', function (done) {
          server.get('/some-package').reply(200, {
            versions: {
              '0.0.1': { version: '0.0.1' },
              '1.0.0': { version: '1.0.0' },
              '1.1.0': { version: '1.1.0', name: 'some-package', dist: {} },
              '2.0.0': { version: '2.0.0' }
            }
          })
          resolve('some-package', '~1.1.0', function (err, pkg) {
            assert.ifError(err)
            assert.deepEqual(pkg, {
              name: 'some-package',
              version: '1.1.0',
              uid: 'f379f6f508a68b25ecea93893d69e7daa7f965bf',
              shasum: undefined,
              tarball: undefined
            })
            done()
          })
        })

        it('should properly handle pending requests', function (doneAll) {
          var pendingRequests = 2
          function done () {
            pendingRequests--
            if (!pendingRequests) {
              doneAll()
            }
          }

          server.get('/some-package').reply(200, {
            versions: {
              '0.0.1': { version: '0.0.1', dist: {} },
              '1.0.0': { version: '1.0.0', dist: {} },
              '1.1.0': { version: '1.1.0', dist: {} },
              '2.0.0': { version: '2.0.0', dist: {} }
            }
          })

          resolve('some-package', '~1.1.0', function (err, pkg) {
            assert.ifError(err)
            assert.deepEqual(pkg.version, '1.1.0')
            done()
          })
          resolve('some-package', '~2.0.0', function (err, pkg) {
            assert.ifError(err)
            assert.equal(pkg.version, '2.0.0')
            done()
          })
        })

        it('should properly cache requests', function () {
          server.get('/some-package').reply(200, {
            versions: {
              '0.0.1': { version: '0.0.1', dist: {} },
              '1.0.0': { version: '1.0.0', dist: {} },
              '1.1.0': { version: '1.1.0', dist: {} },
              '2.0.0': { version: '2.0.0', dist: {} }
            }
          })
          resolve('some-package', '~1.1.0', function (err, pkg) {
            assert.ifError(err)
            assert.equal(pkg.version, '1.1.0')
            resolve('some-package', '~2.0.0', function (err, pkg) {
              assert.ifError(err)
              assert.equal(pkg.version, '2.0.0')
            })
          })
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
