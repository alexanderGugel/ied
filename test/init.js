/* global describe it beforeEach */

var proxyquire = require('proxyquire')
var assert = require('assert')
var mock = require('mockmock')

describe('forceSymlink', function () {
  var init
  var mkdirp
  var cb
  var dir = './eschenbach/'

  beforeEach(function () {
    mkdirp = mock()
    init = proxyquire('../lib/init', {
      mkdirp: mkdirp
    })
    cb = mock()
  })

  it('should mkdir -p ./node_modules/.bin', function () {
    init(dir, cb)
    assert.deepEqual(mkdirp.args, [['eschenbach/node_modules/.bin', cb]])
  })

  it('should accept an optional callback function', function () {
    init(dir)
    assert.equal(typeof mkdirp.args[0][1], 'function')
    assert.doesNotThrow(function () {
      mkdirp.args[0][1]()
    })
  })
})
