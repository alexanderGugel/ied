import configCmd from '../../src/config_cmd'
import sinon from 'sinon'

describe('configCmd', () => {
	const sandbox = sinon.sandbox.create()
	let config

	afterEach(() => sandbox.restore())

	beforeEach(() => {
		config = {
			'key-0': 'value-0',
			'key-1': 'value-1',
			'key-2': 'value-2'
		}
	})

	it('should print all config variables', () => {
		sandbox.stub(console, 'log')
		configCmd(config)()
		Object.keys(config).forEach(key => {
			sinon.assert.calledWith(console.log, sinon.match(key))
			sinon.assert.calledWith(console.log, sinon.match(String(config[key])))
		})
	})
})
