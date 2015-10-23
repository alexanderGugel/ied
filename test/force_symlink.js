/* global describe it beforeEach */

var proxyquire = require('proxyquire')
var assert = require('assert')
var mock = require('mockmock')

describe('forceSymlink', function () {
  var symlink
  var readlink
  var unlink
  var forceSymlink
  var srcPath = 'srcPath'
  var dstPath = 'dstPath'
  var type = 'type'
  var cb

  beforeEach(function () {
    symlink = mock()
    readlink = mock()
    unlink = mock()
    forceSymlink = proxyquire('../lib/force_symlink', {
      fs: {
        symlink: symlink,
        readlink: readlink,
        unlink: unlink
      }
    })
    cb = mock()
  })

  it('should try initial symlink', function () {
    forceSymlink(srcPath, dstPath, type, cb)
    assert.deepEqual(symlink.args[0].slice(0, 3), [ srcPath, dstPath, type ])

    symlink.args[0][3]()
    assert(cb.called)
  })

  it('should callback with non-EEXIST error if initial symlink fails', function () {
    forceSymlink(srcPath, dstPath, type, cb)

    var err = { code: 'SOMETHING' }
    symlink.args[0][3](err)
    assert.equal(cb.args[0][0], err)
  })

  it('should call callback if correct symlink already exists', function () {
    forceSymlink(srcPath, dstPath, type, cb)
    symlink.args[0][3]({ code: 'EEXIST' })

    readlink.args[0][1](null, srcPath)
    assert(cb.called)
  })

  it('should handle readlink error', function () {
    forceSymlink(srcPath, dstPath, type, cb)
    symlink.args[0][3]({ code: 'EEXIST' })

    var err = {}
    readlink.args[0][1](err)
    assert.deepEqual(cb.args[0], [err])
  })

  it('should handle unlink error', function () {
    forceSymlink(srcPath, dstPath, type, cb)
    symlink.args[0][3]({ code: 'EEXIST' })

    var err = {}
    readlink.args[0][1]()
    unlink.args[0][1](err)
    assert.deepEqual(cb.args[0], [err])
  })

  it('should unlink if incorrect symlink already exists', function () {
    forceSymlink(srcPath, dstPath, type, cb)

    symlink.args[0][3]({ code: 'EEXIST' })
    readlink.args[0][1]()
    unlink.args[0][1]()

    assert.deepEqual(symlink.args[1].slice(0, 3), [srcPath, dstPath, null])
    var err = { code: 'SOMETHING' }
    symlink.args[0][3](err)
    assert.deepEqual(cb.args[0], [err])
  })
})
