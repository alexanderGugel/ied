import sinon from 'sinon'
import * as config from '../../src/config'
import configCmd from '../../src/config_cmd'

describe('configCmd', () => {
	const sandbox = sinon.sandbox.create()

	afterEach(() => sandbox.restore())

	it('should print all config variables', () => {
		sandbox.stub(console, 'log')
		configCmd()
		Object.keys(config).forEach(key => {
			sinon.assert.calledWith(console.log, sinon.match(key))
			sinon.assert.calledWith(console.log, sinon.match(String(config[key])))
		})
	})
})
