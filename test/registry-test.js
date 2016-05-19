import sinon from 'sinon'
import assert from 'assert'
import {EmptyObservable} from 'rxjs/observable/EmptyObservable'
import * as registry from '../src/registry'

describe('registry', () => {
	const sandbox = sinon.sandbox.create()

	afterEach(() => sandbox.restore())

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

	describe('validateStatusCode', () => {
		context('when statusCode is not 200', () => {
			it('should throw an error', () => {
				const response = { statusCode: 400, body: { error: 'Some error'} }
				assert.throws(() => {
					registry.validateStatusCode('http://example.com', response)
				})
			})
		})
		context('when statusCode is 200', () => {
			it('should not throw an error', () => {
				const response = { statusCode: 200, body: {} }
				registry.validateStatusCode('http://example.com', response)
			})
		})
	})

	describe('matchSemVer', () => {
		context('when .versions is not an object', () => {
			it('should throw an error', () => {
				const packageRoot = { versions: void 0 }
				assert.throws(() => {
					registry.matchSemVer('1.0.0', packageRoot)
				}, /missing/)
			})
		})
		context('when no matching version is available', () => {
			it('should return null', () => {
				const packageRoot = { versions: { '0.0.1': {} } }
				assert.equal(registry.matchSemVer('1.0.0', packageRoot), null)
			})
		})
		context('when a matching version is available', () => {
			it('should return matching package.json', () => {
				const pkgJson = {}
				const packageRoot = { versions: { '1.2.3': pkgJson } }
				assert.equal(registry.matchSemVer('1.2.x', packageRoot), pkgJson)
			})
		})
	})

	describe('matchTag', () => {
		context('when [\'dist-tags\'] is not an object', () => {
			it('should throw an error', () => {
				const packageRoot = { 'dist-tags': void 0 }
				assert.throws(() => {
					registry.matchTag('some-tag', packageRoot)
				}, /missing/)
			})
		})
		context('when no matching [\'dist-tags\'] is available', () => {
			it('should return null', () => {
				const pkgJson = {}
				const packageRoot = {
					'dist-tags': { 'some-tag': void 0 },
					versions: { '1.0.0': pkgJson }
				}
				assert.equal(registry.matchTag('some-tag', packageRoot), null)
			})
		})
		context('when matching [\'dist-tags\'] is available', () => {
			it('should return matching package.json', () => {
				const pkgJson = {}
				const packageRoot = {
					'dist-tags': { 'some-tag': '1.0.0' },
					versions: { '1.0.0': pkgJson }
				}
				assert.equal(registry.matchTag('some-tag', packageRoot), pkgJson)
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

	describe('httpGetPackageRoot', () => {
		afterEach(() => registry.reset())

		context('when request has already been made', () => {
			it('should return pending request', () => {
				const name = '@alexander/gugel'
				const url = 'https://registry.npmjs.org/@alexander%2Fgugel'
				const pendingRequest = EmptyObservable.create()
				registry.requests[url] = pendingRequest
				const request = registry.httpGetPackageRoot(name)
				assert.equal(request, pendingRequest)
			})
		})
	})
})
