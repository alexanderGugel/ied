/* global describe context it afterEach */

import assert from 'assert'
import sinon from 'sinon'
import {ScalarObservable} from 'rxjs/observable/ScalarObservable'
import {ErrorObservable} from 'rxjs/observable/ErrorObservable'
import * as util from '../src/util'
import * as entryDep from '../src/entry_dep'

const sandbox = sinon.sandbox.create()

afterEach(() => sandbox.restore())

describe('entryDep.fromArgv', () => {
  it('should return ScalarObservable', () => {
    const result = entryDep.fromArgv('/', {_: ['install'], packages: ['tap']})
    assert(result instanceof ScalarObservable)
  })

  it('should create pkgJSON by parsing argv', () => {
    const pkgJSON = { dependencies: {} }
    sandbox.stub(entryDep, 'parseArgv').returns(pkgJSON)
    const next = sinon.spy()
    const error = sinon.spy()
    const complete = sinon.spy()
    entryDep.fromArgv('/cwd', {_: [], packages: []}).subscribe(next, error, complete)
    sinon.assert.calledWith(next, ({pkgJSON, target: '/cwd'}))
    sinon.assert.calledOnce(next)
    sinon.assert.notCalled(error)
    sinon.assert.calledOnce(complete)
  })
})

describe('entryDep.parseArgv', () => {
  const scenarios = [
    {
      argv: { _: ['install'], packages: ['tap'] },
      pkgJSON: {
        dependencies: { tap: '*' }
      }
    },
    {
      argv: { _: ['install'], packages: ['tap'], saveDev: true },
      pkgJSON: {
        devDependencies: { tap: '*' }
      }
    },
    {
      argv: { _: ['install'], packages: ['tap', 'browserify'], saveDev: true },
      pkgJSON: {
        devDependencies: {
          tap: '*',
          browserify: '*'
        }
      }
    },
    {
      argv: { _: ['install'], packages: ['tap', 'browserify']},
      pkgJSON: {
        dependencies: {
          tap: '*',
          browserify: '*'
        }
      }
    }
  ]

  scenarios.forEach(({ argv, pkgJSON: expectedPkgJSON }) => {
    context(`when argv are ${JSON.stringify(argv)}`, () => {
      it('should return correct pkgJSON', () => {
        const actualPkgJSON = entryDep.parseArgv(argv)
        assert.deepEqual(actualPkgJSON, expectedPkgJSON)
      })
    })
  })
})

describe('entryDep.catchReadFileJSON', () => {
  context('when there is an ENOENT error', () => {
    it('should return a neutral pkgJSON', () => {
      const err = new Error()
      err.code = 'ENOENT'

      const next = sinon.spy()
      const error = sinon.spy()
      const complete = sinon.spy()
      ErrorObservable.create(err)
        ::entryDep.catchReadFileJSON()
        .subscribe(next, error, complete)
      sinon.assert.calledOnce(next)
      sinon.assert.calledWithExactly(next, {})
      sinon.assert.notCalled(error)
      sinon.assert.calledOnce(complete)
    })
  })

  context('when there is a non-ENOENT error', () => {
    it('should return a neutral pkgJSON', () => {
      const err = new Error()
      err.code = 'NOTENOENT'

      const next = sinon.spy()
      const error = sinon.spy()
      const complete = sinon.spy()
      ErrorObservable.create(err)
        ::entryDep.catchReadFileJSON()
        .subscribe(next, error, complete)
      sinon.assert.notCalled(next)
      sinon.assert.calledOnce(error)
      sinon.assert.calledWithExactly(error, err)
    })
  })
})

describe('entryDep.fromFS', () => {
  it('should return entry dependency', () => {
    const json = { dependencies: { tap: '*' } }
    const readFileJSON = ScalarObservable.create(json)
    sandbox.stub(util, 'readFileJSON').returns(readFileJSON)

    const next = sinon.spy()
    const error = sinon.spy()
    const complete = sinon.spy()
    entryDep.fromFS('/cwd')
      .subscribe(next, error, complete)

    sinon.assert.notCalled(error)
    sinon.assert.calledOnce(next)
    sinon.assert.calledOnce(complete)

    sinon.assert.calledWithExactly(next, ({pkgJSON: json, target: '/cwd'}))
  })
})
