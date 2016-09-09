import * as registry from '../../src/registry'
import assert from 'assert'
import sinon from 'sinon'

describe('registry', () => {
	const sandbox = sinon.sandbox.create()

	afterEach(() => sandbox.restore())
	afterEach(() => registry.reset())

	describe('escapeName', () => {
		context('when name is scoped', () => {
			it('should preserve "@"', () => {
				const escapedName = registry.escapeName('@hello/world')
				assert.equal(escapedName, '@hello%2Fworld')
			})
		})
		context('when name is not scoped', () => {
			it('should be identity', () => {
				const escapedName = registry.escapeName('world')
				assert.equal(escapedName, 'world')
			})
		})
	})

	describe('checkStatus', () => {
		context('when statusCode is not 200', () => {
			it('should throw an error', () => {
				const response = {statusCode: 400, body: {error: 'Some error'}}
				assert.throws(() => {
					registry.checkStatus('name', 'version')(response)
				})
			})
		})
		context('when statusCode is 200', () => {
			it('should not throw an error', () => {
				const response = {statusCode: 200, body: {}}
				registry.checkStatus('name', 'version')(response)
			})
		})
	})

	describe('requests', () => {
		it('should be a clean object', () => {
			assert.deepEqual(registry.requests, Object.create(null))
		})
	})

	describe('reset', () => {
		context('when requests have been cached', () => {
			beforeEach(() => {
				registry.requests['http://example.com'] = {}
				registry.requests['http://example2.com'] = {}
			})
			it('should delete all cached requests', () => {
				registry.reset()
				assert.deepEqual(registry.requests, Object.create(null))
			})
		})
	})
})
