'use strict'

var crypto = require('crypto')

// generate unique idenifier for the package
// it is sha1 hash from name and version
module.exports = function (name, version) {
  var sha = crypto.createHash('sha1')
  sha.update(name + '@' + version)
  return sha.digest('hex')
}
