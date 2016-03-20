import http from 'http'
import gunzip from 'gunzip-maybe'
import tar from 'tar-fs'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import {Cache} from './Cache'
import url from 'url'
import { Observable } from 'rxjs/Observable'
import { ErrorObservable } from 'rxjs/observable/ErrorObservable'
import { EmptyObservable } from 'rxjs/observable/EmptyObservable'
import { _catch } from 'rxjs/operator/catch'
import {map} from 'rxjs/operator/map'
import protocolToAgent from './protocol_to_agent'
import {cacheDir} from './config'
import {httpGet} from './util'

const cache = new Cache(cacheDir)

function fetchFromRegistry (dest, tarball, shasum) {
  return Observable.create((observer) => {
    const errHandler = (err) => observer.error(err)

    // We need to map the filenames, otherwise we would get paths like
    // [shasum]/package, but we want [shasum] to be have whatever files
    // [package] contains
    const untar = tar.extract(dest)

    // We verify the actual shasum to detect "corrupted" packages.
    const actualShasum = crypto.createHash('sha1')

    httpGet(tarball).subscribe((res) => {
      if (res.statusCode !== 200) {
        return observer.error(new Error('Unexpected status code ' + res.statusCode + ' for ' + tarball))
      }

      // Write to cache.
      const cached = res.pipe(cache.write()).on('error', errHandler)

      function onFinish () {
        const expectedShasum = actualShasum.digest('hex')
        if (expectedShasum !== shasum) {
          observer.error(new Error('Downloaded tarball has incorrect shasum'))
        }

        return fs.rename(cached.path, path.join(cacheDir, shasum), (err) => {
          if (err) return errHandler(err)
          observer.complete()
        })
      }

      res.on('data', (chunk) =>
        actualShasum.update(chunk)
      )

      res.on('error', errHandler)
        .pipe(gunzip()).on('error', errHandler)
        .pipe(untar).on('error', errHandler)
        .on('finish', onFinish)
    }, errHandler)
  })
}

// Fetches the specified tarball. Verifies the passed in shasum if not cached.
export function fetch (dest, tarball, shasum) {
  return cache.fetch(dest, shasum)
    ::_catch((err) => err.code === 'ENOENT'
      ? fetchFromRegistry(dest, tarball, shasum)
      : ErrorObservable.create(err)
    )
}
