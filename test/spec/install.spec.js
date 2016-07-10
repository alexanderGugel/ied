import assert from 'assert'
import nock from 'nock'
import {resolveFromNpm} from '../../src/install'
import {DEFAULT_REGISTRY} from '../../src/registry'
import proxyquire from 'proxyquire'

describe('install', () => {
	describe('resolveFromNpm', () => {
		it('should resolve package to the correct sha sum', done => {
			const shasum = '2e2f3ff96b54d1e3fecceebf0498691054dfce0f'
			nock(DEFAULT_REGISTRY).get('/ied/%5E2.1.0').reply(200, {dist: {shasum}})

			resolveFromNpm(__dirname, __dirname, {name: 'ied', spec: '^2.1.0'}).subscribe(res => {
				assert.equal(res.target, shasum)
				done()
			})
		})

		it('should use configured registry and auth token for scope', done => {
			const shasum = 'shasum'
			const path = __dirname
			nock('https://foo.bar', {
				reqheaders: {
					authorization: 'Bearer some-token'
				}
			}).get('/@rexxars%2Fied').reply(200, {
				versions: {
					'2.1.0': {
						dist: {shasum}
					}
				}
			})

			function tokenStub () {
				return 'some-token'
			}
			tokenStub['@global'] = true

			proxyquire('../../src/install', {
				'registry-auth-token/registry-url': () => 'https://foo.bar',
				'registry-auth-token': tokenStub
			}).resolveFromNpm(path, path, {name: '@rexxars/ied', spec: '^2.1.0'}).subscribe(res => {
				assert.equal(res.target, shasum)
				done()
			})
		})
	})
})
