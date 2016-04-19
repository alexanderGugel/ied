'use strict'

var url = require('url')
var needle = require('needle')
var config = require('./config')

function ping (cb) {
  needle.get(url.resolve(config.registry, '-/ping'), { json: true }, function (err, res) {
    if (err) return cb(err)
    if (res.statusCode !== 200) {
      return cb(new Error('Unexpected status code: ' + res.statusCode))
    }
    cb(null, res.body)
  })
}

function pingCmd () {
  ping(function (err, data) {
    if (err) throw err
    console.log('PONG', data)
  })
}

module.exports = pingCmd
