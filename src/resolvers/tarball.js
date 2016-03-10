'use strict'

var packageUid = require('../util/package_uid')

module.exports = function resolveTarball (name, version, url, cb) {
  cb(null, {
    name: name,
    version: version,
    uid: packageUid(name, version),
    shasum: null,
    tarball: url
  })
}
