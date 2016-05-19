import assert from 'assert'
import sinon from 'sinon'
import * as config from '../src/config'
import * as link from '../src/link'
import fs from 'fs'

describe('link', () => {
	const sandbox = sinon.sandbox.create()

	afterEach(() => sandbox.restore())

	describe('getSymlinks', () => {
		context('when bin = {}', () => {
			it('should return an array of a single global node_modules link', () => {
				const result = link.getSymlinks('/cwd', { name: 'tap' })
				assert.deepEqual(result, [
					['/cwd', `${config.globalNodeModules}/tap`]
				])
			})
		})

		context('when bin = { \'tap\': \'bin/cmd\' }', () => {
			it('should include bin link', () => {
				const result = link.getSymlinks('/cwd', {
					name: 'tap',
					bin: { tap: 'bin/cmd' }
				})
				assert.deepEqual(result, [
					['/cwd', `${config.globalNodeModules}/tap`],
					[
						`${config.globalNodeModules}/tap/bin/cmd`,
						`${config.globalBin}/tap`
					]
				])
			})
		})

		context('when bin = { \'tap\': \'bin/cmd\', \'tap2\': \'bin/cmd2\' }', () => {
			it('should include all bin links', () => {
				const result = link.getSymlinks('/cwd', {
					name: 'tap',
					bin: {
						tap: 'bin/cmd',
						tap2: 'bin/cmd2'
					}
				})
				assert.deepEqual(result, [
					['/cwd', `${config.globalNodeModules}/tap`],
					[
						`${config.globalNodeModules}/tap/bin/cmd`,
						`${config.globalBin}/tap`
					],
					[
						`${config.globalNodeModules}/tap/bin/cmd2`,
						`${config.globalBin}/tap2`
					]
				])
			})
		})
	})

	describe('unlinkFromGlobal', () => {
		it('should remove local symlink that exposes the specified dependency', () => {
			sandbox.stub(fs, 'unlink').yields(null)
			sandbox.stub(console, 'log')
			const cb = sinon.spy()
			link.unlinkFromGlobal('/cwd', 'tap', cb)
			sinon.assert.calledOnce(fs.unlink)
			sinon.assert.calledWithExactly(fs.unlink, '/cwd/node_modules/tap', cb)
			sinon.assert.calledWithExactly(cb, null)
			sinon.assert.calledWithExactly(console.log, 'rm', '/cwd/node_modules/tap')
		})
	})
})
