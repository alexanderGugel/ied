/* global describe it */

import assert from 'assert'
import * as config from '../src/config'

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
