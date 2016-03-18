import url from 'url'
import got from 'got'
import config from './config'

function ping (cb) {
  got(url.resolve(config.registry, '-/ping'), { json: true }, function (err, body, res) {
    if (err) return cb(err)
    if (res.statusCode !== 200) {
      return cb(new Error('Unexpected status code: ' + res.statusCode))
    }
    cb(null, body)
  })
}

export default function pingCmd () {
  ping(function (err, data) {
    if (err) throw err
    console.log('PONG', data)
  })
}
