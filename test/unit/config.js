/* global describe it beforeEach */

'use strict'

var assert = require('assert')
var config = require('../../lib/config')

describe('config', function () {
  var _process

  beforeEach(function () {
    _process = {
      platform: 'darwin',
      execPath: '/usr/local/bin/node',
      env: {
        HOME: '/Users/alex'
      }
    }
  })

  describe('registry', function () {
    it('should use IED_REGISTRY if available', function () {
      _process.env.IED_REGISTRY = 'http://gugel.io'
      assert.equal((new config.constructor(_process)).registry, 'http://gugel.io')
    })

    it('should fall back to npm registry', function () {
      _process.env.IED_REGISTRY = null
      assert.equal(new config.constructor(_process).registry, 'https://registry.npmjs.org/')
    })
  })

  describe('cacheDir', function () {
    it('should use IED_CACHE_DIR if available', function () {
      _process.env.IED_CACHE_DIR = '/some/dir'
      assert.equal((new config.constructor(_process)).cacheDir, '/some/dir')
    })

    it('should fall back to [home]/.ied_cache (win32)', function () {
      _process.platform = 'win32'
      _process.env.USERPROFILE = '/alex'
      assert.equal((new config.constructor(_process)).cacheDir, '/alex/.ied_cache')
    })

    it('should fall back to [home]/.ied_cache (darwin)', function () {
      _process.platform = 'darwin'
      _process.env.HOME = '/Users/alex'
      assert.equal((new config.constructor(_process)).cacheDir, '/Users/alex/.ied_cache')
    })
  })

  describe('globalNodeModules', function () {
    it('should use IED_GLOBAL_NODE_MODULES if available', function () {
      _process.env.IED_GLOBAL_NODE_MODULES = '/node_modules'
      assert.equal((new config.constructor(_process)).globalNodeModules, '/node_modules')
    })

    it('should fall back to [home]/.node_modules (win32)', function () {
      _process.platform = 'win32'
      _process.env.USERPROFILE = '/alex'
      assert.equal((new config.constructor(_process)).globalNodeModules, '/alex/.node_modules')
    })

    it('should fall back to [home]/.node_modules (darwin)', function () {
      _process.platform = 'darwin'
      _process.env.HOME = '/Users/alex'
      assert.equal((new config.constructor(_process)).globalNodeModules, '/Users/alex/.node_modules')
    })
  })

  describe('globalBin', function () {
    it('should use IED_GLOBAL_BIN if available', function () {
      _process.env.IED_GLOBAL_BIN = '/somewhere/bin'
      assert.equal((new config.constructor(_process)).globalBin, '/somewhere/bin')
    })

    it('should fall back to the directory node is in', function () {
      _process.execPath = '/usr/local/bin/node'
      assert.equal((new config.constructor(_process)).globalBin, '/usr/local/bin')
    })
  })
})
