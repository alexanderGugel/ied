var http = require('http')
var config = require('./config')

function ping (cb) {
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

module.exports = ping
