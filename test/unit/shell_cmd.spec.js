import assert from 'assert'
import childProcess from 'child_process'
import sinon from 'sinon'
import {ScalarObservable} from 'rxjs/observable/ScalarObservable'

import * as util from '../../src/util'
import shellCmd from '../../src/shell_cmd'

describe('shellCmd', () => {
	const sandbox = sinon.sandbox.create()
	let config

	afterEach(() => sandbox.restore())

	beforeEach(() => {
		config = {sh: 'sh'}
		sandbox.stub(childProcess, 'spawn')
		sandbox.stub(util, 'readdir')
		sandbox.stub(console, 'log')
	})

	it('should spawn child process', () => {
		util.readdir.returns(ScalarObservable.create([]))
		shellCmd(config)('/cwd').subscribe()

		sinon.assert.calledOnce(childProcess.spawn)
		sinon.assert.calledWith(childProcess.spawn, config.sh, [], {
			stdio: 'inherit',
			env: sinon.match.has('PATH')
		})

		const {env: {PATH}} = childProcess.spawn.getCall(0).args[2]
		assert.equal(PATH.indexOf('/cwd/node_modules/.bin:'), 0)
	})

	it('should add node_modules/.bin to PATH', () => {
		util.readdir.returns(ScalarObservable.create([]))
		shellCmd(config)('/cwd').subscribe()

		const {env: {PATH}} = childProcess.spawn.getCall(0).args[2]
		assert.equal(PATH.indexOf('/cwd/node_modules/.bin:'), 0)
	})

	it('should log available commands', () => {
		const cmds = ['browserify', 'tape', 'npm']
		util.readdir.returns(ScalarObservable.create(cmds))
		shellCmd(config)('/cwd').subscribe()
		const out = console.log.getCall(0).args.join(' ')
		for (const cmd of cmds) {
			assert.notEqual(out.indexOf(cmd), -1, `should log ${cmd}`)
		}
	})
})
