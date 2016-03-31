import {Observable} from 'rxjs/Observable'
import crypto from 'crypto'
import {httpGet} from './util'
import {mergeMap} from 'rxjs/operator/mergeMap'
import {merge} from 'rxjs/operator/merge'
import * as cache from './cache'

function hashResp (resp) {
  return Observable.create((observer) => {
    const shasum = crypto.createHash('sha1')
    const endHandler = () => {
      observer.next(shasum.digest('hex'))
      observer.complete()
    }
    const dataHandler = (chunk) =>
      shasum.update(chunk)
    resp
      .on('data', dataHandler)
      .on('end', endHandler)
  })
}

function cacheResp (resp) {
  return resp.pipe(cache.write())
}

export function download (url) {
  const resp = httpGet(url)

  const cached = resp.mergeMap(cacheResp)
  const hashed = resp.mergeMap(hashResp)

  return cached::merge(hashed)
}

download('https://registry.npmjs.org/tap/-/tap-0.0.2.tgz')
  .subscribe(
    (x) => console.log(x),
    (err) => console.error(err),
    () => console.log('complete')
  )
