/* global describe context it beforeEach afterEach */

import sinon from 'sinon'
import {ScalarObservable} from 'rxjs/observable/ScalarObservable'
import {EmptyObservable} from 'rxjs/observable/EmptyObservable'
import {publishReplay} from 'rxjs/operator/publishReplay'
import semver from 'semver'
import url from 'url'
import * as errors from '../src/errors'
import * as registry from '../src/registry'
import * as util from '../src/util'
import * as config from '../src/config'
import * as imCache from '../src/im_cache'

const sandbox = sinon.sandbox.create()

afterEach(() => {
  sandbox.restore()
  imCache.reset()
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
    const tap = ScalarObservable.create(body)
      ::publishReplay().refCount()
    imCache.set(url.resolve(config.registry, 'tap'), tap)
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
      const err = new errors.VersionError('tap', '9.0.0', Object.keys(body.versions))
      sinon.assert.calledWithExactly(error, err)
      sinon.assert.notCalled(complete)
    })
  })
})
