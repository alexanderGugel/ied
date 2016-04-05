import {Observable} from 'rxjs/Observable'
import http from 'http'
import https from 'https'
import {Buffer} from 'buffer'
import fs from 'fs'
import url from 'url'
import crypto from 'crypto'
import * as cache from './fs_cache'
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

import * as config from './config'
import HttpProxyAgent from 'https-proxy-agent'

export const httpProxy = config.httpProxy && HttpProxyAgent(config.httpProxy)
export const httpsProxy = config.httpsProxy && HttpProxyAgent(config.httpsProxy)

/**
 * Wrapper around Node's [http#get]{@link https://nodejs.org/api/http.html#http_http_get_options_callback} method.
 * @param  {Object|String} options URL or options object as expected by
 * [http#request]{@link https://nodejs.org/api/http.html#http_http_request_options_callback}.
 * @return {Object} An observable sequence of the chunks retrieved from the
 * specified HTTP endpoint.
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
    ::mergeMap((res) => {
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

/**
 * set the terminal title using the required ANSI escape codes.
 * @param {String} title - title to be set.
 */
export function setTerminalTitle (title) {
  process.stdout.write(
    String.fromCharCode(27) + ']0;' + title + String.fromCharCode(7)
  )
}
