'use strict'

var fs = require('fs')

/**
 * Creates a symlink. Re-link if a symlink already exists at the supplied
 * srcPath. API compatible with [`fs#symlink`](https://nodejs.org/api/fs.html#fs_fs_symlink_srcpath_dstpath_type_callback).
 *
 * @param  {String}   srcPath
 * @param  {String}   dstPath
 * @param  {String}   type
 * @param  {Function} cb
 */
function forceSymlink (srcPath, dstPath, type, cb) {
  type = typeof type === 'string' ? type : null
  cb = arguments[arguments.length - 1]
  fs.symlink(srcPath, dstPath, type, function (err) {
    if (!err || err.code !== 'EEXIST') return cb(err)

    fs.readlink(dstPath, function (err, linkString) {
      if (err || srcPath === linkString) return cb(err)

      fs.unlink(dstPath, function (err) {
        if (err) return cb(err)
        forceSymlink(srcPath, dstPath, cb)
      })
    })
  })
}

module.exports = forceSymlink
