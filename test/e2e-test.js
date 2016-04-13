/* global describe it before */

import assert from 'assert'
import {spawn} from 'child_process'
import path from 'path'
import mkdirp from 'mkdirp'
import uuid from 'node-uuid'
import resolve from 'resolve'

const targets = [
  'browserify',
  'express',
  'karma',
  'bower',
  'cordova',
  'coffee-script',
  'gulp',
  'forever',
  'grunt',
  'less'
]

targets.forEach((target) => {
  describe(`ied install ${target}`, function () {
    let cwd

    before(function (done) {
      cwd = path.join(__dirname, 'test', target, uuid())
      mkdirp(cwd, done)
    })

    before(function (done) {
      this.timeout(60 * 1000)
      spawn('node', [path.join(__dirname, '../lib/cmd'), 'install', target], {
        cwd,
        stdio: 'inherit'
      })
        .on('error', done)
        .on('close', (code) => {
          assert.equal(code, 0)
          done()
        })
    })

    it('should make tap require\'able', function (done) {
      resolve(target, { basedir: cwd }, (err, res) => {
        assert.ifError(err)
        assert.notEqual(res.indexOf(cwd), -1)
        require(res)
        done()
      })
    })
  })
})
