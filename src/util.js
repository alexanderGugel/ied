import fs from 'fs'
import needle from 'needle'
import path from 'path'
import _mkdirp from 'mkdirp'
import {Observable} from 'rxjs/Observable'
import {ArrayObservable} from 'rxjs/observable/ArrayObservable'
import _forceSymlink from 'force-symlink'
import {map} from 'rxjs/operator/map'
import {mergeMap} from 'rxjs/operator/mergeMap'
import {_catch} from 'rxjs/operator/catch'

import * as config from './config'

export function createObservableFactory (fn, thisArg) {
  return function () {
    return Observable.create((observer) => {
      fn.apply(thisArg, [...arguments, (error, ...results) => {
        if (error) {
          observer.error(error)
        } else {
          for (let result of results) {
            observer.next(result)
          }
          observer.complete()
        }
      }])
    })
  }
}

export const execMode = parseInt('0777', 8) & (~process.umask())

export function fixPermissions (target, bin) {
  const paths = []
  for (let name in bin) {
    paths.push(path.resolve(target, bin[name]))
  }
  return ArrayObservable.create(paths)
    ::mergeMap((path) => chmod(path, execMode))
}

/**
 * GETs JSON documents from an HTTP endpoint.
 * @param  {String} url - endpoint to which the GET request should be made
 * @return {Object} An observable sequence of the fetched JSON document.
 */
export function httpGetJSON (url) {
  return Observable.create((observer) => {
    needle.get(url, config.httpOptions, (error, response) => {
      if (error) observer.error(error)
      else {
        observer.next(response.body)
        observer.complete()
      }
    })
  })
}

/**
 * normalize the `bin` property in `package.json`, which could either be a
 * string, object or undefined.
 * @param  {Object} pkgJSON - plain JavaScript object representing a
 * `package.json` file.
 * @return {Object} - normalized `bin` property.
 */
export function normalizeBin (pkgJSON) {
  return typeof pkgJSON.bin === 'string'
    ? ({ [pkgJSON.name]: pkgJSON.bin })
    : (pkgJSON.bin || {})
}

export const readFile = createObservableFactory(fs.readFile, fs)
export const writeFile = createObservableFactory(fs.writeFile, fs)
export const stat = createObservableFactory(fs.stat, fs)
export const rename = createObservableFactory(fs.rename, fs)
export const readlink = createObservableFactory(fs.readlink, fs)
export const chmod = createObservableFactory(fs.chmod, fs)

export const forceSymlink = createObservableFactory(_forceSymlink)
export const mkdirp = createObservableFactory(_mkdirp)

export function catchByCode (handlers) {
  return this::_catch((err, caught) => {
    const handler = handlers[err.code]
    if (!handler) throw err
    return handler(err, caught)
  })
}

/**
 * read a UTF8 encoded JSON file from disk.
 * @param  {String} file - filename to be used.
 * @return {Observable} - observable sequence of a single object representing
 * the read JSON file.
 */
export function readFileJSON (file) {
  return readFile(file, 'utf8')::map(JSON.parse)
}

/**
 * set the terminal title using the required ANSI escape codes.
 * @param {String} title - title to be set.
 */
export function setTitle (title) {
  process.stdout.write(
    String.fromCharCode(27) + ']0;' + title + String.fromCharCode(7)
  )
}
