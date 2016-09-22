import assert from 'assert'
import sinon from 'sinon'
import {ScalarObservable} from 'rxjs/observable/ScalarObservable'

import * as util from '../../src/util'

describe('util', () => {
	const sandbox = sinon.sandbox.create()

	afterEach(() => sandbox.restore())

	describe('createObservableFactory', () => {
		context('when wrapping successful callback with arity 1', () => {
			it('should callback a single argument', () => {
				const fn = sandbox.stub().yields(null, 'some data')
				const createObservable = util.createObservableFactory(fn)
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
		})

		context('when callback is being called with error', () => {
			it('should handle callback errors', () => {
				const errorObject = new Error()
				const fn = sandbox.stub().yields(errorObject)
				const createObservable = util.createObservableFactory(fn)
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
	})

	describe('readFile', () => {
		it('should be an exported function', () => {
			assert.equal(typeof util.readFile, 'function')
		})
	})

	describe('writeFile', () => {
		it('should be an exported function', () => {
			assert.equal(typeof util.writeFile, 'function')
		})
	})

	describe('stat', () => {
		it('should be an exported function', () => {
			assert.equal(typeof util.stat, 'function')
		})
	})

	describe('rename', () => {
		it('should be an exported function', () => {
			assert.equal(typeof util.rename, 'function')
		})
	})

	describe('readlink', () => {
		it('should be an exported function', () => {
			assert.equal(typeof util.readlink, 'function')
		})
	})

	describe('chmod', () => {
		it('should be an exported function', () => {
			assert.equal(typeof util.chmod, 'function')
		})
	})

	describe('forceSymlink', () => {
		it('should be an exported function', () => {
			assert.equal(typeof util.forceSymlink, 'function')
		})
	})

	describe('mkdirp', () => {
		it('should be an exported function', () => {
			assert.equal(typeof util.mkdirp, 'function')
		})
	})

	describe('entries', () => {
		it('should split an object into pairs', () => {
			const object = ScalarObservable.create({
				a: 1,
				b: 2,
				c: 3
			})::util.entries()

			const next = sandbox.spy()
			const error = sandbox.spy()
			const complete = sandbox.spy()

			object.subscribe(next, error, complete)
			sinon.assert.calledOnce(complete)
			sinon.assert.notCalled(error)
			sinon.assert.callCount(next, 3)
			sinon.assert.calledWith(next, ['a', 1])
			sinon.assert.calledWith(next, ['b', 2])
			sinon.assert.calledWith(next, ['c', 3])
		})
	})

	describe('setTitle', () => {
		it('should set terminal title', () => {
			const title = 'some title'
			sandbox.stub(process.stdout, 'write')
			util.setTitle(title)
			const exepectedTitle = `${String.fromCharCode(27)}]0;${title}${String.fromCharCode(7)}`
			sinon.assert.calledOnce(process.stdout.write)
			sinon.assert.calledWithExactly(process.stdout.write, exepectedTitle)

			// otherwise nothing will be logged.
			sandbox.restore()
		})
	})
})
