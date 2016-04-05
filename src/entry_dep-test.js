/* global describe context it afterEach */

import assert from 'assert'
import sinon from 'sinon'
import {EntryDep, NullPkgJSON} from './entry_dep'
import {ScalarObservable} from 'rxjs/observable/ScalarObservable'
import {ErrorObservable} from 'rxjs/observable/ErrorObservable'
import * as util from './util'

const sandbox = sinon.sandbox.create()

afterEach(() => sandbox.restore())

describe('NullPkgJSON', () => {
  context('when no arguments are given', () => {
    it('should default to empty dependencies', () => {
      const pkgJSON = new NullPkgJSON()
      assert.deepEqual(pkgJSON, { dependencies: {}, devDependencies: {} })
    })
  })

  context('when empty object is given', () => {
    it('should default to empty dependencies', () => {
      const pkgJSON = new NullPkgJSON({})
      assert.deepEqual(pkgJSON, { dependencies: {}, devDependencies: {} })
    })
  })

  context('when dependencies are given', () => {
    it('should use supplied dependencies', () => {
      const pkgJSON = new NullPkgJSON({
        dependencies: { tap: '*' },
        devDependencies: { standard: '*' }
      })
      assert.deepEqual(pkgJSON, {
        dependencies: { tap: '*' },
        devDependencies: { standard: '*' }
      })
    })
  })
})

describe('EntryDep.fromArgv', () => {
  it('should return ScalarObservable', () => {
    const result = EntryDep.fromArgv('/', {_: ['install', 'tap']})
    assert(result instanceof ScalarObservable)
  })

  it('should create pkgJSON by parsing argv', () => {
    const pkgJSON = { name: 'test' }
    sandbox.stub(EntryDep, 'parseArgv').returns(pkgJSON)
    const next = sinon.spy()
    const error = sinon.spy()
    const complete = sinon.spy()
    EntryDep.fromArgv('/cwd', {_: []}).subscribe(next, error, complete)
    sinon.assert.calledWith(next, new EntryDep({pkgJSON, target: '/cwd'}))
    sinon.assert.calledOnce(next)
    sinon.assert.notCalled(error)
    sinon.assert.calledOnce(complete)
  })
})

describe('EntryDep.parseArgv', () => {
  const scenarios = [
    {
      argv: { _: ['install', 'tap'] },
      pkgJSON: {
        dependencies: { tap: '*' },
        devDependencies: {}
      }
    },
    {
      argv: { _: ['install', 'tap'], saveDev: true },
      pkgJSON: {
        dependencies: {},
        devDependencies: { tap: '*' }
      }
    },
    {
      argv: { _: ['install', 'tap', 'browserify'], saveDev: true },
      pkgJSON: {
        dependencies: {},
        devDependencies: {
          tap: '*',
          browserify: '*'
        }
      }
    },
    {
      argv: { _: ['install', 'tap', 'browserify'] },
      pkgJSON: {
        dependencies: {
          tap: '*',
          browserify: '*'
        },
        devDependencies: {}
      }
    }
  ]

  scenarios.forEach(({ argv, pkgJSON: expectedPkgJSON }) => {
    context(`when argv are ${JSON.stringify(argv)}`, () => {
      it('should return correct pkgJSON', () => {
        const actualPkgJSON = EntryDep.parseArgv(argv)
        assert.deepEqual(actualPkgJSON, expectedPkgJSON)
      })
    })
  })
})

describe('EntryDep.catchReadFileJSON', () => {
  context('when there is an ENOENT error', () => {
    it('should return a neutral pkgJSON', () => {
      const err = new Error()
      err.code = 'ENOENT'

      const next = sinon.spy()
      const error = sinon.spy()
      const complete = sinon.spy()
      ErrorObservable.create(err)
        ::EntryDep.catchReadFileJSON()
        .subscribe(next, error, complete)
      sinon.assert.calledOnce(next)
      sinon.assert.calledWithExactly(next, new NullPkgJSON())
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
        ::EntryDep.catchReadFileJSON()
        .subscribe(next, error, complete)
      sinon.assert.notCalled(next)
      sinon.assert.calledOnce(error)
      sinon.assert.calledWithExactly(error, err)
    })
  })
})

describe('EntryDep.fromFS', () => {
  it('should return entry dependency', () => {
    const json = { dependencies: { tap: '*' } }
    const readFileJSON = ScalarObservable.create(json)
    sandbox.stub(util, 'readFileJSON').returns(readFileJSON)

    const next = sinon.spy()
    const error = sinon.spy()
    const complete = sinon.spy()
    EntryDep.fromFS('/cwd')
      .subscribe(next, error, complete)

    sinon.assert.notCalled(error)
    sinon.assert.calledOnce(next)
    sinon.assert.calledOnce(complete)

    const entryDep = new EntryDep({pkgJSON: json, target: '/cwd'})
    sinon.assert.calledWithExactly(next, entryDep)
  })
})
