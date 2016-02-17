'use strict'

var locks = Object.create(null)

exports.lock = lock
function lock (key) {
  if (locks[key]) {
    return false
  }
  locks[key] = true
  return true
}

exports.unlock = unlock
function unlock (key) {
  if (!locks[key]) {
    return false
  }
  locks[key] = false
  return true
}
