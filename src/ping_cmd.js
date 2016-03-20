import url from 'url'
import got from 'got'
import {registry} from './config'

function ping (cb) {
  const uri = url.resolve(registry, '-/ping')
  got(uri, { json: true }, (err, body, res) => {
    if (err) return cb(err)
    if (res.statusCode !== 200) {
      return cb(new Error('Unexpected status code: ' + res.statusCode))
    }
    cb(null, body)
  })
}

export default function run () {
  ping((err, data) => {
    if (err) throw err
    console.log('PONG', data)
  })
}
