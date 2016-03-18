import { Observable } from 'rxjs/Observable'
import http from 'http'
import { Buffer } from 'buffer'
import fs from 'fs'
import _mkdirp from 'mkdirp'
import _forceSymlink from 'force-symlink'

import { map } from 'rxjs/operator/map'
import { takeUntil } from 'rxjs/operator/takeUntil'
import { toArray } from 'rxjs/operator/toArray'
import { race } from 'rxjs/operator/race'
import { concatMap } from 'rxjs/operator/concatMap'
import { mergeMap } from 'rxjs/operator/mergeMap'
import { FromEventObservable } from 'rxjs/observable/FromEventObservable'

/**
 * Wrapper around Node's [http#get]{@link https://nodejs.org/api/http.html#http_http_get_options_callback} method.
 * @param  {Object|String} options URL or options object as expected by
 * [http#request]{@link https://nodejs.org/api/http.html#http_http_request_options_callback}.
 * @return {Object} An observable sequence of the chunks retrieved from the specified HTTP endpoint.
 */
export const httpGet = (options) => {
  return Observable.create((observer) => {
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
export const httpGetJSON = (options) => httpGet(options)::concatMap((res) => {
  const error = FromEventObservable.create(res, 'error')::mergeMap(Observable.throwError)
  const end = FromEventObservable.create(res, 'end')
  return FromEventObservable.create(res, 'data')::takeUntil(end::race(error))
})::toArray()::map((chunks) => Buffer.concat(chunks).toString())::map(JSON.parse)

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

export const omitError = (code) => (err) => {
  switch (err.code) {
    case code:
      return Observable.return()
    default:
      return Observable.throw(err)
  }
}

export const readFileJSON = (file) => readFile(file, 'utf8')::map(JSON.parse)
