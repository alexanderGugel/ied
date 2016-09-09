import assert from 'assert'
import sinon from 'sinon'
import * as config from '../../src/config'
import * as link from '../../src/link'

describe('link', () => {
	const sandbox = sinon.sandbox.create()

	afterEach(() => sandbox.restore())

	describe('getSymlinks', () => {
		const scenarios = [
			[
				{
					name: 'tap'
				},
				[
					['/cwd', `${config.globalNodeModules}/tap`]
				]
			],
			[
				{
					name: 'tap',
					bin: 'cmd.js'
				},
				[
					['/cwd', `${config.globalNodeModules}/tap`],
					[`${config.globalNodeModules}/tap/cmd.js`, `${config.globalBin}/tap`]
				]
			],
			[
				{
					name: 'tap',
					bin: {tap: 'bin/cmd'}
				},
				[
					['/cwd', `${config.globalNodeModules}/tap`],
					[`${config.globalNodeModules}/tap/bin/cmd`, `${config.globalBin}/tap`]
				]
			],
			[
				{
					name: 'tap',
					bin: {
						tap: 'bin/cmd',
						tap2: 'bin/cmd2'
					}
				},
				[
					['/cwd', `${config.globalNodeModules}/tap`],
					[`${config.globalNodeModules}/tap/bin/cmd`, `${config.globalBin}/tap`],
					[`${config.globalNodeModules}/tap/bin/cmd2`, `${config.globalBin}/tap2`]
				]
			],
			[
				{
					name: 'tap',
					bin: {tap: 'bin/cmd'}
				},
				[
					['/cwd', `${config.globalNodeModules}/tap`],
					[`${config.globalNodeModules}/tap/bin/cmd`, `${config.globalBin}/tap`]
				]
			]
		]

		scenarios.forEach(([bin, expected]) => {
			context(`when pkgJSON = ${JSON.stringify(bin)}`, () => {
				it(`should return ${JSON.stringify(expected)}`, () => {
					const actual = link.getSymlinks('/cwd', bin)
					assert.deepEqual(actual, expected)
				})
			})
		})
	})
})
