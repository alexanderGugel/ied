import assert from 'assert'
import sinon from 'sinon'
import shellCmd from '../src/shell_cmd'
import childProcess from 'child_process'
import * as config from '../src/config'

describe('shellCmd', () => {
	const sandbox = sinon.sandbox.create()
	afterEach(() => sandbox.restore())

	it('should spawn child process', () => {
		sandbox.stub(childProcess, 'spawn')

		shellCmd('/cwd')

		sinon.assert.calledOnce(childProcess.spawn)
		sinon.assert.calledWith(childProcess.spawn, config.sh, [], {
			stdio: 'inherit',
			env: sinon.match.has('PATH')
		})

		const {env: {PATH}} = childProcess.spawn.getCall(0).args[2]
		assert.equal(PATH.indexOf('/cwd/node_modules/.bin:'), 0)
	})

	it('should include node_modules/.bin in PATH', () => {
		sandbox.stub(childProcess, 'spawn')
		shellCmd('/cwd')

		const {env: {PATH}} = childProcess.spawn.getCall(0).args[2]
		assert.equal(PATH.indexOf('/cwd/node_modules/.bin:'), 0)
	})
})
