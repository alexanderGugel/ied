import fs from 'fs'
import path from 'path'
import async from 'async'
import {globalNodeModules, globalBin} from './config'
import forceSymlink from 'force-symlink'

/**
 * generate the symlinks to be created in order to link to passed in package.
 * @param {String} cwd - current working directory.
 * @param {Object} pkgJSON - `package.json` file to be linked.
 * @return {[]String} - an array of tuples representing symbolic links to be
 * created.
 */
export function getSymlinks (cwd, pkgJSON) {
  const libSymlink = [cwd, path.join(globalNodeModules, pkgJSON.name)]
  let bin = pkgJSON.bin
  if (typeof bin === 'string') {
    bin = {}
    bin[pkgJSON.name] = pkgJSON.bin
  }
  bin = bin || {}
  const binSymlinks = Object.keys(bin).map((name) => ([
    path.join(globalNodeModules, pkgJSON.name, bin[name]),
    path.join(globalBin, name)
  ]))
  return binSymlinks.concat([libSymlink])
}

/*
 * globally expose the package we're currently in (used for `ied link`).
 * @param {String} cwd - current working directory.
 * @param {Function} cb - callback function.
 */
export function linkToGlobal (cwd, cb) {
  const pkg = require(path.join(cwd, 'package.json'))
  const symlinks = getSymlinks(cwd, pkg)
  async.each(symlinks, ([srcPath, dstPath], cb) => {
    console.log(dstPath, '->', srcPath)
    forceSymlink(srcPath, dstPath, cb)
  }, cb)
}

/**
 * links a globally linked package into the package present in the current
 * working directory (used for `ied link some-package`).
 * the package can be `require`d afterwards.
 * `node_modules/.bin` stays untouched.
 * @param {String} cwd - current working directory.
 * @param {String} name - name of the dependency to be linked.
 * @param {Function} cb - callback function.
 */
export function linkFromGlobal (cwd, name, cb) {
  const dstPath = path.join(cwd, 'node_modules', name)
  const srcPath = path.join(globalNodeModules, name)
  console.log(dstPath, '->', srcPath)
  forceSymlink(srcPath, dstPath, cb)
}

/**
 * revert the effects of `ied link` by removing the previously created
 * symbolic links (used for `ied unlink`).
 * @param {String} cwd - current working directory.
 * @param {String} name - name of the dependency to be unlinked.
 * @param {Function} cb - callback function.
 */
export function unlinkToGlobal (cwd, name, cb) {
  const pkg = require(path.join(cwd, 'package.json'))
  const symlinks = getSymlinks(cwd, pkg)
  async.each(symlinks, function (symlink, cb) {
    const dstPath = symlink[1]
    console.log('rm', dstPath)
    fs.unlink(dstPath, cb)
  }, cb)
}

/**
 * revert the effects of `ied unlink some-package` by removing the previously
 * created symbolic links from the project's `node_modules` directory (used for
 * `ied unlink some-package`).
 * @param {String} cwd - current working directory.
 * @param {String} name - name of the dependency to be unlinked from the
 * project's `node_modules`.
 * @param {Function} cb - callback fucntion.
 */
export function unlinkFromGlobal (cwd, name, cb) {
  const dstPath = path.join(cwd, 'node_modules', name)
  console.log('rm', dstPath)
  fs.unlink(dstPath, cb)
}
