/* global describe it afterEach */

import sinon from 'sinon'
import * as util from '../src/util'

const sandbox = sinon.sandbox.create()

afterEach(() => sandbox.restore())

describe('util.wrapIntoObservable', () => {
  it('should handle successful callbacks with a single result', () => {
    const fn = sandbox.stub().yields(null, 'some data')
    const createObservable = util.wrapIntoObservable(fn)
    const next = sandbox.spy()
    const error = sandbox.spy()
    const complete = sandbox.spy()
    createObservable('endpoint').subscribe(next, error, complete)
    sinon.assert.calledWithExactly(next, 'some data')
    sinon.assert.calledOnce(next)
    sinon.assert.calledOnce(complete)
    sinon.assert.notCalled(error)
    sinon.assert.calledOnce(fn)
    sinon.assert.calledWith(fn, 'endpoint')
  })

  it('should handle callback errors', () => {
    const errorObject = new Error()
    const fn = sandbox.stub().yields(errorObject)
    const createObservable = util.wrapIntoObservable(fn)
    const next = sandbox.spy()
    const error = sandbox.spy()
    const complete = sandbox.spy()
    createObservable('endpoint').subscribe(next, error, complete)
    sinon.assert.calledWithExactly(error, errorObject)
    sinon.assert.calledOnce(error)
    sinon.assert.notCalled(complete)
    sinon.assert.notCalled(next)
    sinon.assert.calledOnce(fn)
  })
})
