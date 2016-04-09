/* global describe it afterEach */

import assert from 'assert'
import fs from 'fs'
import sinon from 'sinon'
import stream from 'stream'
import tar from 'tar-fs'
import path from 'path'
import uuid from 'node-uuid'
import {Observable} from 'rxjs/Observable'

import * as cache from './fs_cache'
import * as config from './config'
import * as util from './util'

const sandbox = sinon.sandbox.create()

afterEach(() => sandbox.restore())

describe('fsCache.init', () => {
  it('should return Observable', () => {
    assert(cache.init() instanceof Observable)
  })

  it('should mkdirp the cache directory', () => {
    const o = Observable.create()
    sandbox.stub(util, 'mkdirp').returns(o)
    cache.init()
    sinon.assert.calledOnce(util.mkdirp)
    sinon.assert.calledWithExactly(util.mkdirp, path.join(config.cacheDir, '.tmp'))
  })
})

describe('fsCache.write', () => {
  it('should open a WriteStream to random temporary location in cacheDir', () => {
    const writeStream = {}
    const randomId = '123'
    sandbox.stub(uuid, 'v4').returns(randomId)
    sandbox.stub(fs, 'WriteStream').returns(writeStream)
    assert.equal(cache.write(), writeStream, 'should return result of fs.WriteStream')
    sinon.assert.calledWithExactly(fs.WriteStream, `${config.cacheDir}/.tmp/${randomId}`)
  })
})

describe('fsCache.read', () => {
  it('should open a ReadStream to specified shasum in cacheDir', () => {
    const readStream = {}
    const shasum = '5e2f6970611f079c7cf857de1dc7aa1b480de7a5'
    sandbox.stub(fs, 'ReadStream').returns(readStream)
    assert.equal(cache.read(shasum), readStream, 'should return result of fs.ReadStream')
    sinon.assert.calledWithExactly(fs.ReadStream, `${config.cacheDir}/${shasum}`)
  })
})

describe('fsCache.extract', () => {
  it('should return lazy Observable', () => {
    sandbox.spy(cache, 'read')
    const shasum = '5e2f6970611f079c7cf857de1dc7aa1b480de7a5'
    assert(cache.extract('./', shasum) instanceof Observable)
    sinon.assert.notCalled(cache.read)
  })

  it('should handle read error', (done) => {
    const readStream = stream.Readable()
    sandbox.stub(cache, 'read').returns(readStream)
    const expectedError = new Error()

    cache.extract().subscribe(() => {}, (actualError) => {
      assert.equal(actualError, expectedError)
      done()
    })

    readStream.emit('error', expectedError)
  })

  it('should handle tar.extract error', (done) => {
    const readStream = stream.Readable()
    sandbox.stub(cache, 'read').returns(stream.Readable())
    sandbox.stub(tar, 'extract').returns(readStream)

    const expectedError = new Error()

    cache.extract().subscribe(() => {}, (actualError) => {
      assert.equal(actualError, expectedError)
      done()
    })

    readStream.emit('error', expectedError)
  })

  it('should complete Observable when cache.read ends', (done) => {
    const readStream = stream.PassThrough()
    sandbox.stub(cache, 'read').returns(readStream)

    cache.extract().subscribe(() => {}, (err) => {
      assert.ifError(err)
    }, done)

    readStream.emit('end')
  })
})
