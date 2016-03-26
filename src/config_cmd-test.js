/* global describe context it afterEach */

import assert from 'assert'
import sinon from 'sinon'
import * as config from './config'
import configCmd from './config_cmd'

const sandbox = sinon.sandbox.create()

afterEach(() => sandbox.restore())

describe('configCmd', () => {
  it('should print all config variables', () => {
    sandbox.spy(console, 'log')
    configCmd()
    for (let key in config) {
      sinon.assert.calledWith(console.log, sinon.match(key))
      sinon.assert.calledWith(console.log, sinon.match(String(config[key])))
    }
  })
})