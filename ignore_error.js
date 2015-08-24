'use strict'

function ignoreError (ignore, cb) {
  return function (err) {
    var args = [!err || err.code === ignore ? null : err].concat(
      Array.prototype.slice.call(arguments, 1)
    )
    cb.apply(null, args)
  }
}

module.exports = ignoreError
