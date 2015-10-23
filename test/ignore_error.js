/* global describe it beforeEach */

var assert = require('assert')
var mock = require('mockmock')
var ignoreError = require('../lib/ignore_error')

describe('ignoreError', function () {
  var cb

  beforeEach(function () {
    cb = mock()
  })

  it('should replace ignored error with null argument', function () {
    var ignored = ignoreError('SOMETHING', cb)
    ignored({ code: 'SOMETHING' }, 1, 2, 3)
    assert.deepEqual(cb.args, [[null, 1, 2, 3]])
  })

  it('should pass on all other errors', function () {
    var ignored = ignoreError('SOMETHING', cb)
    var err = { code: 'SOMETHING ELSE' }
    ignored(err, 1, 2, 3)
    assert.deepEqual(cb.args, [[err, 1, 2, 3]])
  })
})
