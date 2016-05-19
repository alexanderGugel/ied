import assert from 'assert'
import * as config from '../src/config'

describe('config', () => {
	describe('isWindows', () => {
		it('should be boolean', () => {
			assert.equal(typeof config.isWindows, 'boolean')
		})
	})

	describe('home', () => {
		it('should be string', () => {
			assert.equal(typeof config.home, 'string')
		})
	})

	describe('registry', () => {
		it('should be string', () => {
			assert.equal(typeof config.registry, 'string')
		})
	})

	describe('cacheDir', () => {
		it('should be string', () => {
			assert.equal(typeof config.cacheDir, 'string')
		})
	})

	describe('globalNodeModules', () => {
		it('should be string', () => {
			assert.equal(typeof config.globalNodeModules, 'string')
		})
	})

	describe('globalBin', () => {
		it('should be string', () => {
			assert.equal(typeof config.globalBin, 'string')
		})
	})

	describe('httpProxy', () => {
		it('should be string or null', () => {
			if (config.httpProxy) {
				assert.equal(typeof config.httpProxy, 'string')
			} else {
				assert.equal(config.httpProxy, null)
			}
		})
	})

	describe('httpsProxy', () => {
		it('should be string or null', () => {
			if (config.httpProxy) {
				assert.equal(typeof config.httpsProxy, 'string')
			} else {
				assert.equal(config.httpsProxy, null)
			}
		})
	})

	describe('requestRetries', () => {
		it('should be number', () => {
			assert.equal(typeof config.requestRetries, 'number')
		})
	})

	describe('sh', () => {
		it('should be string', () => {
			assert.equal(typeof config.sh, 'string')
		})
	})
})
