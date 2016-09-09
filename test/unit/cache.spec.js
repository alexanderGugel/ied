import assert from 'assert'
import fs from 'fs'
import sinon from 'sinon'
import stream from 'stream'
import tar from 'tar-fs'
import path from 'path'
import uuid from 'node-uuid'
import {Observable} from 'rxjs/Observable'

import * as cache from '../../src/cache'
import * as config from '../../src/config'
import * as util from '../../src/util'

describe('cache', () => {
	const sandbox = sinon.sandbox.create()

	afterEach(() => sandbox.restore())

	describe('init', () => {
		it('should return Observable', () => {
			assert.equal(cache.init().constructor, Observable)
		})

		it('should mkdirp the cache directory', () => {
			const o = Observable.create()
			sandbox.stub(util, 'mkdirp').returns(o)
			cache.init()
			sinon.assert.calledOnce(util.mkdirp)
			sinon.assert.calledWithExactly(util.mkdirp, path.join(config.cacheDir, '.tmp'))
		})
	})

	describe('write', () => {
		it('should open a WriteStream to random temporary location in cacheDir', () => {
			const writeStream = {}
			const randomId = '123'
			sandbox.stub(uuid, 'v4').returns(randomId)
			sandbox.stub(fs, 'createWriteStream').returns(writeStream)
			assert.equal(cache.write(), writeStream, 'should return result of fs.createWriteStream')
			sinon.assert.calledWithExactly(fs.createWriteStream, `${config.cacheDir}/.tmp/${randomId}`)
		})
	})

	describe('getTmp', () => {
		it('should return a temporary directory', () => {
			const randomId = '123'
			sandbox.stub(uuid, 'v4').returns(randomId)
			const tmpDir = path.join(config.cacheDir, '.tmp')
			assert.ok(cache.getTmp().match(tmpDir))
			assert.ok(cache.getTmp(), path.join(tmpDir, randomId))
		})
	})

	describe('read', () => {
		it('should open a ReadStream to specified shasum in cacheDir', () => {
			const readStream = {}
			const shasum = '5e2f6970611f079c7cf857de1dc7aa1b480de7a5'
			sandbox.stub(fs, 'createReadStream').returns(readStream)
			assert.equal(cache.read(shasum), readStream, 'should return result of fs.createReadStream')
			sinon.assert.calledWithExactly(fs.createReadStream, `${config.cacheDir}/${shasum}`)
		})
	})

	describe('extract', () => {
		it('should return cold Observable', () => {
			sandbox.spy(cache, 'read')
			const shasum = '5e2f6970611f079c7cf857de1dc7aa1b480de7a5'
			assert(cache.extract('./', shasum).constructor, Observable)
			sinon.assert.notCalled(cache.read)
		})

		context('when cache.read read stream emits an error', () => {
			it('should throw an error', () => {
				const readStream = new stream.Readable()
				sandbox.stub(fs, 'createReadStream').returns(readStream)
				const expectedError = new Error()

				const next = sandbox.stub()
				const error = sandbox.stub()
				const complete = sandbox.stub()

				cache.extract('/dest', 'id').subscribe(next, error, complete)
				readStream.emit('error', expectedError)

				sinon.assert.notCalled(next)
				sinon.assert.notCalled(complete)
				sinon.assert.calledOnce(error)
				sinon.assert.calledWithExactly(error, expectedError)
			})
		})

		context('when tar.extract read stream emits an error', () => {
			it('should thorw an error', () => {
				const readStream = new stream.Readable()
				sandbox.stub(fs, 'createReadStream').returns(readStream)
				sandbox.stub(tar, 'extract').returns(readStream)

				const expectedError = new Error()

				const next = sandbox.stub()
				const error = sandbox.stub()
				const complete = sandbox.stub()

				cache.extract('/dest', 'id').subscribe(next, error, complete)
				readStream.emit('error', expectedError)

				sinon.assert.notCalled(next)
				sinon.assert.notCalled(complete)
				sinon.assert.calledOnce(error)
				sinon.assert.calledWithExactly(error, expectedError)
			})
		})
	})
})
