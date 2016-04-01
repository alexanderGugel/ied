import {Observable} from 'rxjs/Observable'
import http from 'http'
import https from 'https'
import {Buffer} from 'buffer'
import fs from 'fs'
import url from 'url'
import crypto from 'crypto'
import * as cache from './cache'
import _mkdirp from 'mkdirp'
import _forceSymlink from 'force-symlink'
import gunzip from 'gunzip-maybe'

import {map} from 'rxjs/operator/map'
import {takeUntil} from 'rxjs/operator/takeUntil'
import {toArray} from 'rxjs/operator/toArray'
import {race} from 'rxjs/operator/race'
import {_do} from 'rxjs/operator/do'
import {share} from 'rxjs/operator/share'
import {merge} from 'rxjs/operator/merge'
import {concatMap} from 'rxjs/operator/concatMap'
import {mergeMap} from 'rxjs/operator/mergeMap'
import {FromEventObservable} from 'rxjs/observable/FromEventObservable'

import config from './config'
import HttpProxyAgent from 'https-proxy-agent'

export const httpProxy = config.httpProxy && HttpProxyAgent(config.httpProxy)
export const httpsProxy = config.httpsProxy && HttpProxyAgent(config.httpsProxy)

/**
 * Wrapper around Node's [http#get]{@link https://nodejs.org/api/http.html#http_http_get_options_callback} method.
 * @param  {Object|String} options URL or options object as expected by
 * [http#request]{@link https://nodejs.org/api/http.html#http_http_request_options_callback}.
 * @return {Object} An observable sequence of the chunks retrieved from the specified HTTP endpoint.
 */
export function httpGet (options) {
  return Observable.create((observer) => {
    if (typeof options === 'string') {
      options = url.parse(options)
    }
    switch (options.protocol) {
      case 'https:':
        options.agent = httpsProxy || https.globalAgent
        break
      case 'http:':
        options.agent = httpProxy || http.globalAgent
    }

    const handler = (response) => {
      observer.next(response)
      observer.complete()
    }
    const errHandler = (err) => observer.error(err)
    http.get(options, handler).on('error', errHandler)
  })
}

/**
 * GETs JSON documents from an HTTP endpoint.
 * @param  {Object|String} options Options as accepted by [httpGet]{@link httpGet}.
 * @return {Object} An observable sequence of the fetched JSON document.
 */
export function httpGetJSON (options) {
  return httpGet(options)
    ::concatMap((res) => {
      const error = FromEventObservable.create(res, 'error')
        ::mergeMap(Observable.throwError)
      const end = FromEventObservable.create(res, 'end')
      return FromEventObservable.create(res, 'data')
        ::takeUntil(end::race(error))
    })
    ::toArray()
    ::map((chunks) => Buffer.concat(chunks).toString())
    ::map(JSON.parse)
}

export function readFile (file, options) {
  return Observable.create((observer) => {
    fs.readFile(file, options, (error, data) => {
      if (error) observer.error(error)
      else {
        observer.next(data)
        observer.complete()
      }
    })
  })
}

export function writeFile (file, data, options) {
  return Observable.create((observer) => {
    fs.writeFile(file, data, options, (error) => {
      if (error) observer.error(error)
      else observer.complete()
    })
  })
}

export function forceSymlink (target, path, type) {
  return Observable.create((observer) => {
    _forceSymlink(target, path, type, (error) => {
      if (error) observer.error(error)
      else observer.complete()
    })
  })
}

export function mkdirp (dir, opts) {
  return Observable.create((observer) => {
    _mkdirp(dir, opts, (error) => {
      if (error) observer.error(error)
      else observer.complete()
    })
  })
}

export function stat (path) {
  return Observable.create((observer) => {
    fs.stat(path, (err, stat) => {
      if (err) observer.error(err)
      else {
        observer.next(stat)
        observer.complete()
      }
    })
  })
}

export function rename (oldPath, newPath) {
  return Observable.create((observer) => {
    fs.rename(oldPath, newPath, (err) => {
      if (err) observer.error(err)
      else observer.complete()
    })
  })
}

export function readlink (path) {
  return Observable.create((observer) => {
    fs.readlink(path, (err, linkString) => {
      if (err) observer.error(err)
      else {
        observer.next(linkString)
        observer.complete()
      }
    })
  })
}

/**
 * read a UTF8 encoded JSON file from disk.
 * @param  {String} filename - filename to be used.
 * @return {Observable} - observable sequence of a single object representing
 * the read JSON file.
 */
export function readFileJSON (filename) {
  return readFile(filename, 'utf8')::map(JSON.parse)
}

export function setTerminalTitle (title) {
  process.stdout.write(
    String.fromCharCode(27) + "]0;" + title + String.fromCharCode(7)
  )
}

/**
 * @private
 * @param  {http.Response} res - http response stream.
 * @return {Observable} - observable sequence of final cached results.
 */
function fsCacheResponse (res) {
  return Observable.create((observer) => {
    if (res.statusCode !== 200) {
      throw new Error(`unexpected status code ${res.statusCode} for ${url}`)
    }

    const shasum = crypto.createHash('sha1')
    const dest = cache.write()
    const cached = cache.write()

    const errHandler = (error) => observer.error(error)

    let after = 1
    const handler = (stream) => {
      observer.next({ shasum, stream })
      if (!(after--)) observer.complete()
    }

    res
      .on('error', errHandler)
      .on('data', (chunk) => shasum.update(chunk))

    res.pipe(dest)
      .on('error', errHandler)
      .on('finish', () => handler(dest))
  })
}

export function fetchFromRegistry (resp) {
  return Observable.create((observer) => {
    const errHandler = (err) => observer.error(err)

    const untar = tar.extract(dest)

    // We verify the actual shasum to detect "corrupted" packages.
    const actualShasum = crypto.createHash('sha1')

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

    res.on('data', (chunk) => actualShasum.update(chunk))

    res.on('error', errHandler)
      .pipe(gunzip()).on('error', errHandler)
      .pipe(untar).on('error', errHandler)
      .on('finish', onFinish)
  })
}

export function assertStatusCode (expected) {
  return this::_do((resp) => {
    if (resp.statusCode !== expected) {
      throw new Error(`unexpected status code: expected ${expected}, got ${resp.statusCode}`)
    }
  })
}

function _extract () {
  return this
  // this::mergeMap((resp) => Observable.create((observer) => {
  //   const cached = cache.write()

  //   const errHandler = (err) => observer.error(err)
  //   const finHandler = () => {
  //     observer.next(cached)  
  //     observer.complete()
  //   }

  //   res.pipe(cached)
  //     .on('error', errHandler)
  //     .on('finish', finHandler)
  // })
}

function _cache () {
  return this::mergeMap((resp) => Observable.create((observer) => {
    const cached = cache.write()

    const errHandler = (err) => observer.error(err)
    const finHandler = () => {
      observer.next(cached)
      observer.complete()
    }

    res.pipe(cached)
      .on('error', errHandler)
      .on('finish', finHandler)
  }))
}

/**
 * download a tarball from a given endpoint.
 * @param {String} tarball - url of the tarball.
 * @return {Observable} - observable sequence of the target directories into
 * which the tarball has been downloaded.
 */
export function download (url) {
  const resp = httpGet(url)
    ::assertStatusCode(200)
    ::share()

  return resp

  // const cached = resp::_cache()
  // return cached

  // const extracted = resp::_extract()
  // const hashed = resp::_calcShasum()

  // return cached::merge(extracted)
}
