import sinon from 'sinon'
import url from 'url'
import assert from 'assert'
import {EmptyObservable} from 'rxjs/observable/EmptyObservable'
import * as registry from '../../src/registry'
import nock from 'nock'

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
				const response = {statusCode: 400, body: {error: 'Some error'}}
				assert.throws(() => {
					registry.checkStatus('http://example.com', response)
				})
			})
		})
		context('when statusCode is 200', () => {
			it('should not throw an error', () => {
				const response = {statusCode: 200, body: {}}
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

	describe('match', () => {
		context('when non-legacy mode is enabled', () => {
			it('should use endpoint with version selector', done => {
				const scope = nock(registry.DEFAULT_REGISTRY).get('/ied/%5E2.1.0').reply(200, {})
				registry.match('ied', '^2.1.0', {}).subscribe(() => {
					scope.done()
					done()
				})
			})
		})

		context('when legacy mode is enabled', () => {
			it('should use endpoint for whole package history', done => {
				const scope = nock(registry.DEFAULT_REGISTRY)
					.get('/ied')
					.reply(200, {versions: {}})

				registry.match('ied', '^2.1.0', {legacyMode: true}).subscribe(() => {
					scope.done()
					done()
				})
			})

			it('should resolve the highest satisfiying version', done => {
				const scope = nock(registry.DEFAULT_REGISTRY)
					.get('/ied')
					.reply(200, {versions: {
						'0.4.7': {},
						'1.2.1': {},
						'1.2.2': {correct: true},
						'1.0.3': {},
						'2.0.0': {}
					}})

				registry.match('ied', '^1.0.3', {legacyMode: true}).subscribe(res => {
					assert(res.correct)
					scope.done()
					done()
				})
			})

			it('should resolve the highest version when specifying wildcard', done => {
				const scope = nock(registry.DEFAULT_REGISTRY)
					.get('/ied')
					.reply(200, {versions: {
						'0.4.7': {},
						'2.0.0': {correct: true},
						'1.0.3': {}
					}})

				registry.match('ied', '*', {legacyMode: true}).subscribe(res => {
					assert(res.correct)
					scope.done()
					done()
				})
			})

			it('should resolve tags', done => {
				const scope = nock(registry.DEFAULT_REGISTRY)
					.get('/ied')
					.reply(200, {
						'dist-tags': {foo: '2.0.0'},
						versions: {'2.0.0': {correct: true}}
					})

				registry.match('ied', 'foo', {legacyMode: true}).subscribe(res => {
					assert(res.correct)
					scope.done()
					done()
				})
			})
		})
	})
})
