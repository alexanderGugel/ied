/* global describe it beforeEach */

import assert from 'assert'
import config, {Config} from './config'

describe('Config', () => {
  var _process

  beforeEach(() => {
    _process = {
      platform: 'darwin',
      execPath: '/usr/local/bin/node',
      env: {
        HOME: '/Users/alex'
      }
    }
  })

  describe('registry', () => {
    it('should use IED_REGISTRY if available', () => {
      _process.env.IED_REGISTRY = 'http://gugel.io'
      assert.equal((new Config(_process)).registry, 'http://gugel.io')
    })

    it('should fall back to npm registry', () => {
      _process.env.IED_REGISTRY = null
      assert.equal(new Config(_process).registry, 'https://registry.npmjs.org/')
    })
  })

  describe('cacheDir', () => {
    it('should use IED_CACHE_DIR if available', () => {
      _process.env.IED_CACHE_DIR = '/some/dir'
      assert.equal((new Config(_process)).cacheDir, '/some/dir')
    })

    it('should fall back to [home]/.ied_cache (win32)', () => {
      _process.platform = 'win32'
      _process.env.USERPROFILE = '/alex'
      assert.equal((new Config(_process)).cacheDir, '/alex/.ied_cache')
    })

    it('should fall back to [home]/.ied_cache (darwin)', () => {
      _process.platform = 'darwin'
      _process.env.HOME = '/Users/alex'
      assert.equal((new Config(_process)).cacheDir, '/Users/alex/.ied_cache')
    })
  })

  describe('globalNodeModules', () => {
    it('should use IED_GLOBAL_NODE_MODULES if available', () => {
      _process.env.IED_GLOBAL_NODE_MODULES = '/node_modules'
      assert.equal((new Config(_process)).globalNodeModules, '/node_modules')
    })

    it('should fall back to [home]/.node_modules (win32)', () => {
      _process.platform = 'win32'
      _process.env.USERPROFILE = '/alex'
      assert.equal((new Config(_process)).globalNodeModules, '/alex/.node_modules')
    })

    it('should fall back to [home]/.node_modules (darwin)', () => {
      _process.platform = 'darwin'
      _process.env.HOME = '/Users/alex'
      assert.equal((new Config(_process)).globalNodeModules, '/Users/alex/.node_modules')
    })
  })

  describe('globalBin', () => {
    it('should use IED_GLOBAL_BIN if available', () => {
      _process.env.IED_GLOBAL_BIN = '/somewhere/bin'
      assert.equal((new Config(_process)).globalBin, '/somewhere/bin')
    })

    it('should fall back to the directory node is in', () => {
      _process.execPath = '/usr/local/bin/node'
      assert.equal((new Config(_process)).globalBin, '/usr/local/bin')
    })
  })
})

describe('config.isWindows', () => {
  it('should be boolean', () => {
    assert.equal(typeof config.isWindows, 'boolean')
  })
})

describe('config.home', () => {
  it('should be string', () => {
    assert.equal(typeof config.home, 'string')
  })
})

describe('config.registry', () => {
  it('should be string', () => {
    assert.equal(typeof config.registry, 'string')
  })
})

describe('config.cacheDir', () => {
  it('should be string', () => {
    assert.equal(typeof config.cacheDir, 'string')
  })
})

describe('config.globalNodeModules', () => {
  it('should be string', () => {
    assert.equal(typeof config.globalNodeModules, 'string')
  })
})

describe('config.globalBin', () => {
  it('should be string', () => {
    assert.equal(typeof config.globalBin, 'string')
  })
})

describe('config.httpProxy', () => {
  it('should be string or null', () => {
    if (config.httpProxy) {
      assert.equal(typeof config.httpProxy, 'string')
    } else {
      assert.equal(config.httpProxy, null)
    }
  })
})

describe('config.httpsProxy', () => {
  it('should be string or null', () => {
    if (config.httpProxy) {
      assert.equal(typeof config.httpsProxy, 'string')
    } else {
      assert.equal(config.httpsProxy, null)
    }
  })
})

describe('config.requestRetries', () => {
  it('should be number', () => {
    assert.equal(typeof config.requestRetries, 'number')
  })
})

describe('config.sh', () => {
  it('should be string', () => {
    assert.equal(typeof config.sh, 'string')
  })
})

describe('config.shFlag', () => {
  it('should be string', () => {
    assert.equal(typeof config.shFlag, 'string')
  })
})
