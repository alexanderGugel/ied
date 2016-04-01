/* global describe it afterEach */

import assert from 'assert'
import sinon from 'sinon'
import shellCmd from './shell_cmd'
import child_process from 'child_process'
import * as config from './config'

const sandbox = sinon.sandbox.create()

afterEach(() => sandbox.restore())

describe('shellCmd', () => {
  it('should spawn child process', () => {
    sandbox.stub(child_process, 'spawn')

    shellCmd('/cwd')

    sinon.assert.calledOnce(child_process.spawn)
    sinon.assert.calledWith(child_process.spawn, config.sh, [], {
      stdio: 'inherit',
      env: sinon.match.has('PATH')
    })

    const { env: { PATH } } = child_process.spawn.getCall(0).args[2]
    assert.equal(PATH.indexOf('/cwd/node_modules/.bin:'), 0)
  })

  it('should include node_modules/.bin in PATH', () => {
    sandbox.stub(child_process, 'spawn')
    shellCmd('/cwd')

    const { env: { PATH } } = child_process.spawn.getCall(0).args[2]
    assert.equal(PATH.indexOf('/cwd/node_modules/.bin:'), 0)
  })
})
