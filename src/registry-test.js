/* global describe context it afterEach */

import assert from 'assert'
import sinon from 'sinon'
import {ScalarObservable} from 'rxjs/observable/ScalarObservable'
import {ErrorObservable} from 'rxjs/observable/ErrorObservable'
import {EmptyObservable} from 'rxjs/observable/EmptyObservable'
import {publishReplay} from 'rxjs/operator/publishReplay'
import semver from 'semver'
import * as registry from './registry'
import * as util from './util'
import config from './config'

const sandbox = sinon.sandbox.create()

/**
 * clear the internal registry cache
 */
function clearCache () {
  const keys = Object.keys(registry.cache)
  keys.forEach((key) => {
    delete registry.cache[key]
  })
}

afterEach(() => {
  sandbox.restore()
  clearCache()
})

describe('registry.httpGetPackageRoot', () => {
  context('when requesting a package for the first time', () => {
    it('should forward registry response', () => {  
      const next = sinon.spy()
      const error = sinon.spy()
      const complete = sinon.spy()

      const body = { name: 'tap', versions: [] }
      const result = ScalarObservable.create(body)
      sandbox.stub(util, 'httpGetJSON').returns(result)

      registry.httpGetPackageRoot('tap')
        .subscribe(next, error, complete)

      sinon.assert.notCalled(error)
      sinon.assert.calledWithExactly(next, body)
      sinon.assert.calledOnce(complete)
    })

    it('should GET from the correct registry endpoint', () => {
      sandbox.stub(util, 'httpGetJSON').returns(EmptyObservable.create())

      registry.httpGetPackageRoot('tap')
        .subscribe()

      sinon.assert.calledOnce(util.httpGetJSON)
      sinon.assert.calledWith(util.httpGetJSON, `${config.registry}tap`)
    })
  })

  context('when requesting a package for the second time', () => {
    it('should return cached response', () => {
      const next = sinon.spy()
      const error = sinon.spy()
      const complete = sinon.spy()

      const body = { name: 'tap', versions: [] }
      const result = ScalarObservable.create(body)
      sandbox.stub(util, 'httpGetJSON').returns(result)

      registry.httpGetPackageRoot('tap')
        .subscribe()

      registry.httpGetPackageRoot('tap')
        .subscribe(next, error, complete)

      sinon.assert.notCalled(error)
      sinon.assert.calledWithExactly(next, body)
      sinon.assert.calledOnce(complete)
    })
  })
})

describe('registry.resolve', () => {
  const body = {
    versions: {
      '1.0.0': { name: 'tap', version: '1.0.0' },
      '1.3.0': { name: 'tap', version: '1.3.0' },
      '2.1.0': { name: 'tap', version: '2.1.0' },
      '2.2.0': { name: 'tap', version: '2.2.0' }
    }
  }

  beforeEach(() => {
    registry.cache.tap = ScalarObservable.create(body)
      ::publishReplay().refCount()
  })

  context('when satisfying version is available', () => {
    it('should return max satisfying version', () => {
      sandbox.stub(semver, 'maxSatisfying').returns('1.0.0')

      const next = sinon.spy()
      const error = sinon.spy()
      const complete = sinon.spy()

      registry.resolve('tap', '1.0.0')
        .subscribe(next, error, complete)

      sinon.assert.notCalled(error)
      sinon.assert.calledOnce(next)
      sinon.assert.calledWithExactly(next, body.versions['1.0.0'])
      sinon.assert.calledOnce(complete)
    })

    it('should use max satisfying version', () => {
      sandbox.stub(semver, 'maxSatisfying').returns('1.0.0')

      registry.resolve('tap', '1.0.0')
        .subscribe()

      sinon.assert.calledWith(semver.maxSatisfying, Object.keys(body.versions))
    })
  })

  context('when no satisfying version is available', () => {
    it('should throw an error', () => {
      sandbox.stub(semver, 'maxSatisfying').returns(null)

      const next = sinon.spy()
      const error = sinon.spy()
      const complete = sinon.spy()

      registry.resolve('tap', '9.0.0')
        .subscribe(next, error, complete)

      sinon.assert.notCalled(next)
      sinon.assert.calledOnce(error)
      const err = new registry.VersionError({
        name: 'tap',
        version: '9.0.0',
        available: Object.keys(body.versions)
      })
      sinon.assert.calledWithExactly(error, err)
      sinon.assert.notCalled(complete)
    })
  })
})

describe('registry.VersionError', () => {
  it('should have expected properties', () => {
    const err = new registry.VersionError({
      name: 'tap',
      version: '1.0.0',
      available: ['0.0.1', '0.0.2']
    })
    assert.equal(err.pkgName, 'tap')
    assert.equal(err.version, '1.0.0')
    assert.deepEqual(err.available, ['0.0.1', '0.0.2'])
    assert.equal(err.name, 'VersionError')
    assert.ok(err.message)
  })

  it('should include name, version and available versions in message', () => {
    const err = new registry.VersionError({
      name: 'tap',
      version: '1.0.0',
      available: ['0.0.1', '0.0.2']
    })
    assert(err.message.match(/no satisying version/))
    assert(err.message.match('1.0.0'))
    assert(err.message.match('0.0.1, 0.0.2'))
  })
})