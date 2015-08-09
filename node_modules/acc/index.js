'use strict'

function acc (count, callback) {
  if (typeof count !== 'number' || (count | 0) !== count || count < 0) {
    throw new Error('count needs to be > 0')
  }
  if (typeof callback !== 'function') {
    throw new Error('callback needs to be a function')
  }

  var results = []

  function fn () {
    if (fn.invoked === fn.count) {
      throw new Error('acc called too many times')
    }
    for (var i = 0; i < arguments.length; i++) {
      results[i] = results[i] || []
      results[i][fn.invoked] = arguments[i]
    }
    if (++fn.invoked === fn.count) callback.apply(null, results)
  }

  fn.invoked = 0
  fn.count = count

  return fn
}

module.exports = acc
