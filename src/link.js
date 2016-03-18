import fs from 'fs'
import path from 'path'
import async from 'async'
import {globalNodeModules, globalBin} from './config'
import forceSymlink from 'force-symlink'

// Generates the symlinks to be created in order to link to passed in package.
exports.getSymlinks = getSymlinks
function getSymlinks (cwd, pkg) {
  const libSymlink = [cwd, path.join(globalNodeModules, pkg.name)]
  let bin = pkg.bin
  if (typeof bin === 'string') {
    bin = {}
    bin[pkg.name] = pkg.bin
  }
  bin = bin || {}
  const binSymlinks = Object.keys(bin).map(function (name) {
    return [
      path.join(globalNodeModules, pkg.name, bin[name]),
      path.join(globalBin, name)
    ]
  })
  return binSymlinks.concat([ libSymlink ])
}

// Used for `ied link`.
// Should globally expose the package we're currently in.
exports.linkToGlobal = linkToGlobal
function linkToGlobal (cwd, cb) {
  const pkg = require(path.join(cwd, 'package.json'))
  const symlinks = getSymlinks(cwd, pkg)
  async.each(symlinks, function (symlink, cb) {
    const srcPath = symlink[0]
    const dstPath = symlink[1]
    console.log(dstPath, '->', srcPath)
    forceSymlink(srcPath, dstPath, cb)
  }, cb)
}

// Used for `ied link some-package`.
// Allows you to `require` `some-package` in the current repo afterwards.
// This won't change your project's node_modules/.bin directory.
exports.linkFromGlobal = linkFromGlobal
function linkFromGlobal (cwd, name, cb) {
  const dstPath = path.join(cwd, 'node_modules', name)
  const srcPath = path.join(globalNodeModules, name)
  console.log(dstPath, '->', srcPath)
  forceSymlink(srcPath, dstPath, cb)
}

// Used for `ied unlink`.
// Reverts `ied link` by removing the previously created symlinks.
exports.unlinkToGlobal = unlinkToGlobal
function unlinkToGlobal (cwd, name, cb) {
  const pkg = require(path.join(cwd, 'package.json'))
  const symlinks = getSymlinks(cwd, pkg)
  async.each(symlinks, function (symlink, cb) {
    const dstPath = symlink[1]
    console.log('rm', dstPath)
    fs.unlink(dstPath, cb)
  }, cb)
}

// Used for `ied unlink some-package`.
// Reverts `ied unlink some-package` by removing the previously created
// symlinks from the project's node_modules directory.
exports.unlinkFromGlobal = unlinkFromGlobal
function unlinkFromGlobal (cwd, name, cb) {
  const dstPath = path.join(cwd, 'node_modules', name)
  console.log('rm', dstPath)
  fs.unlink(dstPath, cb)
}
