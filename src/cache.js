import { Observable } from 'rxjs/Observable'

import gunzip from 'gunzip-maybe'
import tar from 'tar-fs'
import fs from 'fs'
import path from 'path'
import uuid from 'node-uuid'
import config from './config'
import mkdirp from 'mkdirp'

export function write () {
  return fs.WriteStream(path.join(config.cacheDir, '.tmp', uuid()))
}

export function read (shasum) {
  return fs.ReadStream(path.join(config.cacheDir, shasum))
}

export function fetch (dest, shasum, cb) {
  return Observable.create((observer) => {
    const finHandler = (err) => observer.complete()
    const errHandler = (err) => observer.error(err)

    const untar = tar.extract(dest, { strip: 1 })
    read(shasum).on('error', errHandler)
      .pipe(gunzip()).on('error', errHandler)
      .pipe(untar).on('error', errHandler)
      .on('finish', finHandler)
  })
}
