'use strict'

/**
 * Utility function used for creating wrapper functions used for filtering out
 * errors.
 *
 * @param  {String}   code  The code of the error to be ignored.
 * @param  {Function} cb    The callback function to be wrapped.
 * @return {Function}       A wrapper function that filters out errors with the
 *                          predefined code.
 */
function ignoreError (code, cb) {
  return function (err) {
    const args = [!err || err.code === code ? null : err].concat(
      Array.prototype.slice.call(arguments, 1)
    )
    cb.apply(null, args)
  }
}

module.exports = ignoreError
