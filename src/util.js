/**
 * @overview Utility methods used throughout the program and RxJS wrappers
 * around used Node APIs.
 * @module lib/util
 * @license MIT
 * @author Alexander Gugel <alexander.gugel@gmail.com>
 */

'use strict'

import { Observable } from 'rxjs/Observable'
import { AsyncSubject } from 'rxjs/subject/AsyncSubject'
import http from 'http'
import { Buffer } from 'buffer'
import fs from 'fs'
import _mkdirp from 'mkdirp'

import 'rxjs/add/operator/map'
import 'rxjs/add/operator/let'
import 'rxjs/add/operator/catch'
import 'rxjs/add/operator/mergeMap'

/**
 * Wrapper around Node's [http#get]{@link https://nodejs.org/api/http.html#http_http_get_options_callback} method.
 * @param  {Object|String} options URL or options object as expected by
 * [http#request]{@link https://nodejs.org/api/http.html#http_http_request_options_callback}.
 * @return {Object} An observable sequence of the chunks retrieved from the specified HTTP endpoint.
 */
export const httpGet = (options) => {
  const subject = new AsyncSubject()
  const handler = (response) => {
    subject.next(response)
    subject.complete()
  }
  const errHandler = (err) => subject.error(err)
  http.get(options, handler).on('error', errHandler)
  return subject
}

/**
 * GETs JSON documents from an HTTP endpoint.
 * @param  {Object|String} options Options as accepted by [httpGet]{@link httpGet}.
 * @return {Object} An observable sequence of the fetched JSON document.
 */
export const httpGetJSON = (options) => httpGet(options).concatMap((res) => {
  const error = Observable.fromEvent(res, 'error').mergeMap(Observable.throwError)
  const end = Observable.fromEvent(res, 'end')
  return Observable.fromEvent(res, 'data').takeUntil(end.amb(error))
}).toArray().map((chunks) => Buffer.concat(chunks).toString()).map(JSON.parse)

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

// export const readFile = Observable.fromNodeCallback(fs.readFile)
// export const mkdir = Observable.fromNodeCallback(fs.mkdir)

export function writeFile (file, data, options) {
  return Observable.create((observer) => {
    fs.writeFile(file, data, options, (error) => {
      if (error) observer.error(error)
      else observer.complete()
    })
  })
}

export function symlink (target, path, type) {
  return Observable.create((observer) => {
    fs.symlink(target, path, type, (error) => {
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

export const omitError = (code) => (err) => {
  switch (err.code) {
    case code:
      return Observable.return()
    default:
      return Observable.throw(err)
  }
}

export const readFileJSON = (file) => readFile(file, 'utf8').map(JSON.parse)
