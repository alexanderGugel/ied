import assert from 'assert'
import sinon from 'sinon'
import {ScalarObservable} from 'rxjs/observable/ScalarObservable'
import * as util from '../src/util'
import * as pkgJson from '../src/pkg_json'

describe('pkgJson', () => {
	const sandbox = sinon.sandbox.create()

	afterEach(() => sandbox.restore())

	describe('mergeDependencies', () => {
		it('should merge dependency fields', () => {
			const _pkgJson = {
				dependencies: {
					tap: '1.0.1',
					browserify: '1.0.9'
				},
				devDependencies: {
					tap: '2.5.0',
					'is-array': '2.1.2'
				}
			}
			const fields = ['dependencies', 'devDependencies']
			const result = pkgJson.mergeDependencies(_pkgJson, fields)
			assert.deepEqual(result, {
				tap: '2.5.0',
				browserify: '1.0.9',
				'is-array': '2.1.2'
			})
		})
	})

	describe('parseBundleDependencies', () => {
		it('should return array of bundled dependencies', () => {
			const _pkgJson = {
				bundleDependencies: ['tap', 'is-array'],
				bundledDependencies: ['browserify']
			}
			const result = pkgJson.parseBundleDependencies(_pkgJson)
			assert.deepEqual(result, ['tap', 'is-array', 'browserify'])
		})
	})

	describe('parseDependencies', () => {
		it('should extract specified dependencies', () => {
			const _pkgJson = {
				dependencies: {
					tap: '1.0.1',
					browserify: '1.0.9'
				},
				devDependencies: {
					tap: '2.5.0',
					'is-array': '2.1.2'
				}
			}
			const fields = ['dependencies', 'devDependencies']
			const result = pkgJson.parseDependencies(_pkgJson, fields)
			assert.deepEqual(result, [
				['tap', '2.5.0'],
				['browserify', '1.0.9'],
				['is-array', '2.1.2']
			])
		})

		it('should ignore bundled dependencies', () => {
			const _pkgJson = {
				dependencies: {
					tap: '1.0.1',
					browserify: '1.0.9',
					'is-array': '2.1.2'
				},
				bundleDependencies: ['tap'],
				bundledDependencies: ['is-array']
			}
			const fields = ['dependencies']
			const result = pkgJson.parseDependencies(_pkgJson, fields)
			assert.deepEqual(result, [['browserify', '1.0.9']])
		})
	})

	describe('normalizeBin', () => {
		context('when bin is a string', () => {
			it('should set name as key', () => {
				const name = 'some-package'
				const bin = 'some-file.js'
				const _pkgJson = {name, bin}
				const result = pkgJson.normalizeBin(_pkgJson)
				assert.deepEqual(result, {[name]: bin})
			})
		})

		context('when bin is an object', () => {
			it('should return bin', () => {
				const bin = {'some-command': 'some-file.js'}
				const _pkgJson = {bin}
				const result = pkgJson.normalizeBin(_pkgJson)
				assert.deepEqual(result, bin)
			})
		})

		context('when bin is undefined', () => {
			it('should return empty object', () => {
				const _pkgJson = {}
				const result = pkgJson.normalizeBin(_pkgJson)
				assert.deepEqual(result, {})
			})
		})

		context('when bin is of some other type', () => {
			it('should return empty object', () => {
				const _pkgJson = {bin: 123}
				const result = pkgJson.normalizeBin(_pkgJson)
				assert.deepEqual(result, {})
			})
		})
	})

	describe('fromFs', () => {
		it('should read in package.json', () => {
			const _pkgJson = {name: 'some-package'}
			const readStub = sandbox.stub(util, 'readFileJSON')
			readStub.returns(ScalarObservable.create(_pkgJson))
			const next = sinon.spy()
			const error = sinon.spy()
			const complete = sinon.spy()
			pkgJson.fromFs('/some/dir').subscribe(next, error, complete)
			sinon.assert.calledOnce(next)
			sinon.assert.notCalled(error)
			sinon.assert.calledOnce(complete)
			sinon.assert.calledWith(next, _pkgJson)
			sinon.assert.calledWith(readStub, '/some/dir/package.json')
		})
	})

	describe('updatePkgJson', () => {
		it('should patch package.json', () => {
			const dependencies = {tap: '1.0.0', 'is-array': '2.0.0'}
			const devDependencies = {browserify: '1.0.0', express: '0.0.1'}
			const _pkgJson = {dependencies, devDependencies}
			const diff = {
				dependencies: {
					ava: '1.0.0'
				},
				devDependencies: {
					browserify: '2.0.0',
					connect: '0.0.1'
				}
			}
			const result = pkgJson.updatePkgJson(_pkgJson, diff)
			assert.notEqual(result, _pkgJson)
			assert.deepEqual(result, {
				dependencies: {
					ava: '1.0.0',
					'is-array': '2.0.0',
					tap: '1.0.0'
				},
				devDependencies: {
					browserify: '2.0.0',
					connect: '0.0.1',
					express: '0.0.1'
				}
			})
		})
	})

	describe('fromArgv', () => {
		it('should return ScalarObservable', () => {
			const result = pkgJson.fromArgv('/', {_: ['install', 'tap']})
			assert.ok(result._isScalar)
		})

		it('should create pkgJSON by parsing argv', () => {
			const _pkgJson = {dependencies: {}}
			sandbox.stub(pkgJson, 'parseArgv').returns(_pkgJson)
			const next = sinon.spy()
			const error = sinon.spy()
			const complete = sinon.spy()
			pkgJson.fromArgv('/cwd', {_: []})
				.subscribe(next, error, complete)
			sinon.assert.calledOnce(next)
			sinon.assert.calledWith(next, _pkgJson)
			sinon.assert.notCalled(error)
			sinon.assert.calledOnce(complete)
		})
	})

	describe('parseArgv', () => {
		context('when --save-dev', () => {
			it('should add to devDependencies', () => {
				const result = pkgJson.parseArgv({_: [null, 'tap@1.0.0'], 'save-dev': true})
				assert.deepEqual(result, {devDependencies: {tap: '1.0.0'}})
			})
		})
		context('when --save-optional', () => {
			it('should add to optionalDependencies', () => {
				const result = pkgJson.parseArgv({_: [null, 'tap@1.0.0'], 'save-optional': true})
				assert.deepEqual(result, {optionalDependencies: {tap: '1.0.0'}})
			})
		})
		context('when --save', () => {
			it('should add to dependencies', () => {
				const result = pkgJson.parseArgv({_: [null, 'tap@1.0.0'], save: true})
				assert.deepEqual(result, {dependencies: {tap: '1.0.0'}})
			})
		})
	})
})
