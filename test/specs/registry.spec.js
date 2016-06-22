import sinon from 'sinon'
import url from 'url'
import assert from 'assert'
import {EmptyObservable} from 'rxjs/observable/EmptyObservable'
import * as registry from '../../src/registry'

describe('registry', () => {
	const sandbox = sinon.sandbox.create()

	afterEach(() => sandbox.restore())
	afterEach(() => registry.reset())

	describe('DEFAULT_REGISTRY', () => {
		it('should be HTTPS URL', () => {
			assert.equal(typeof registry.DEFAULT_REGISTRY, 'string')
			assert.equal(url.parse(registry.DEFAULT_REGISTRY).protocol, 'https:')
		})
	})

	describe('DEFAULT_RETRIES', () => {
		it('should be a number', () => {
			assert.equal(typeof registry.DEFAULT_RETRIES, 'number')
			assert(registry.DEFAULT_RETRIES >= 0)
		})
	})

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
				const response = { statusCode: 400, body: { error: 'Some error'} }
				assert.throws(() => {
					registry.checkStatus('http://example.com', response)
				})
			})
		})
		context('when statusCode is 200', () => {
			it('should not throw an error', () => {
				const response = { statusCode: 200, body: {} }
				registry.checkStatus('http://example.com', response)
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

	describe('fetch', () => {
		context('when request has already been made', () => {
			it('should return pending request', () => {
				const uri = 'https://example.com/example'
				const pendingRequest = EmptyObservable.create()
				registry.requests[uri] = pendingRequest
				const request = registry.fetch(uri)
				assert.equal(request, pendingRequest)
			})
		})
	})
})
