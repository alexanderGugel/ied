var fs = require('fs')
var path = require('path')

function save (dir, type, deps, cb) {
  deps = Array.isArray(deps) ? deps : [deps]
  cb = cb || function () {}
  dir = path.join(dir, 'package.json')
  fs.readFile(dir, 'utf8', function (err, packageJSON) {
    if (err && err.code !== 'ENOENT') {
      return cb(err)
    }
    packageJSON = packageJSON || '{}'
    try {
      packageJSON = JSON.parse(packageJSON)
    } catch (err) {
      return cb(err)
    }
    packageJSON[type] = packageJSON[type] || {}
    deps.forEach(function (dependency) {
      packageJSON[type][dependency.name] = '^' + dependency.version
    })
    fs.writeFile(dir, JSON.stringify(packageJSON, null, 2), 'utf8', function (err) {
      cb(err, packageJSON)
    })
  })
}

module.exports = save
