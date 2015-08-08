var path = require('path')
var http = require('http')
var fs = require('fs')
var semver = require('semver')
var gunzip = require('gunzip-maybe')
var mkdirp = require('mkdirp')
var tar = require('tar-fs')

/**
 * Resolves a dependency to an exact version.
 *
 * @param  {String}   dep     The name of the dependency to be resolved, e.g.
 *                            `tape`.
 * @param  {String}   version The [semver](http://semver.org/) compatible
 *                            version string of the dependency, e.g. ``^5.0.1`.
 * @param  {Function} cb      Callback function to be executed on (successful)
 *                            resolution to an exact version number.
 */
function resolve (dep, version, cb) {
  cb = cb || function () {}
  console.info('resolving', dep + '@' + version)
  http.get('http://registry.npmjs.org/' + dep, function (res) {
    if (res.statusCode !== 200) return cb(new Error('non 200 statusCode from registry', res.statusCode))
    var raw = ''
    res.on('data', function (chunk) { raw += chunk })
    res.on('end', function () {
      var parsed = JSON.parse(raw)
      var resolved = parsed.versions[semver.maxSatisfying(Object.keys(parsed.versions), version)]
      cb(resolved ? null : new Error('no satisfying target found for ' + dep + '@' + version), resolved)
    }).on('error', cb)
  }).on('error', cb)
}

/**
 * Downloads and decodes a dependency.
 *
 * @param  {String}   where Pathname of directory where to put downloaded
 *                          dependency into.
 * @param  {Object}   what  `package.json` of dependency encoded as an object.
 * @param  {Function} cb    Callback function to be executed when download is
 *                          complete.
 */
function fetch (where, what, cb) {
  cb = cb || function () {}
  console.info('fetching', what.name + '@' + what.version, 'into', path.relative(process.cwd(), where))
  http.get(what.dist.tarball, function (res) {
    if (res.statusCode !== 200) return cb(new Error('non 200 statusCode from registry', res.statusCode))
    res.pipe(gunzip()).pipe(tar.extract(where, {
      map: function (header) {
        header.name = header.name.split('/').slice(1).join('/')
        return header
      }
    })).on('finish', cb).on('error', cb)
  }).on('error', cb)
}

/**
 * Recursively installs a dependency.
 *
 * @param {String}          where   Pathname of installation destination.
 * @param {Object}          what    `package.json` of initial dependency
 *                                  encoded as an object.
 * @param {Array.<String>}  family  shasums of [available](https://nodejs.org/api/modules.html#modules_loading_from_node_modules_folders)
 *                                  dependencies.
 * @param {Boolean}         entry   If this is the entry point of the
 *                                  installation process (installs
 *                                  `devDependencies`).
 */
function install (where, what, family, entry) {
  console.info('installing', what.name + '@' + what.version, 'into', path.relative(process.cwd(), where))
  family = family.slice()
  mkdirp.sync(where)
  var deps = []
  function onResolved (err, resolved) {
    deps.push(resolved)
    if (deps.length === Object.keys(what.dependencies).length + (entry ? Object.keys(what.devDependencies || {}).length : 0)) onResolvedAll()
  }
  function onResolvedAll () {
    deps.forEach(function (dep) {
      if (family.indexOf(dep.dist.shasum) > -1) return
      family.push(dep.dist.shasum)
      process.nextTick(install.bind(null, path.join(where, 'node_modules', dep.name), dep, family))
    })
  }
  for (var dep in what.dependencies)
    resolve(dep, what.dependencies[dep], onResolved)
  if (entry) {
    for (dep in what.devDependencies)
      resolve(dep, what.devDependencies[dep], onResolved)
  } else {
    fetch(where, what, function (err) {
      if (err) throw err
      fs.writeFile(path.join(where, 'package.json'), JSON.stringify(what, null, 2))
    })
  }
}

module.exports = {
  resolve: resolve,
  fetch: fetch,
  install: install
}
