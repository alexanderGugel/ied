/* global describe it afterEach */

import assert from 'assert'
import initCmd from './init_cmd'

describe('initCmd', () => {
  it('should be a function', () => {
    assert.equal(typeof initCmd, 'function')
  })
})
