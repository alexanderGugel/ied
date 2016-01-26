'use strict'

var http = require('http')
var https = require('https')
var url  = require('url')
var config = require('./config')

function ping (cb) {
  if (url.parse(config.registry).protocol === 'https:') {
    http = https
  }
  http.get(config.registry + '-/ping', function (res) {
    if (res.statusCode !== 200) {
      return cb(new Error('Unexpected status code: ' + res.statusCode))
    }

    var raw = ''
    res.on('error', cb)
    res.on('data', function (chunk) { raw += chunk })
    res.on('end', function () {
      try {
        var json = JSON.parse(raw)
      } catch (e) {
        return cb(e)
      }
      cb(null, json)
    })
  }).on('error', cb)
}

function pingCmd () {
  ping(function (err, data) {
    if (err) throw err
    console.log('PONG')
  })
}

module.exports = pingCmd
