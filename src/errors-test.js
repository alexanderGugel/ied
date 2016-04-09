/* global describe it */

import assert from 'assert'
import * as errors from './errors'

describe('errors.VersionError', () => {
  it('should have expected properties', () => {
    const err = new errors.VersionError('tap', '1.0.0', ['0.0.1', '0.0.2'])
    assert.equal(err.pkgName, 'tap')
    assert.equal(err.version, '1.0.0')
    assert.deepEqual(err.available, ['0.0.1', '0.0.2'])
    assert.equal(err.name, 'VersionError')
    assert.ok(err.message)
  })

  it('should include name, version and available versions in message', () => {
    const err = new errors.VersionError('tap', '1.0.0', ['0.0.1', '0.0.2'])
    assert(err.message.match(/no satisying version/))
    assert(err.message.match('1.0.0'))
    assert(err.message.match('0.0.1, 0.0.2'))
  })
})
