'use strict'

var path = require('path')
var mkdirp = require('mkdirp')
var resolve = require('./resolve')
var EventEmitter = require('events').EventEmitter

/**
 * merge dependency fields.
 * @param  {Object} pkgJSON - `package.json` object from which the dependencies
 * should be obtained.
 * @param  {Array.<String>} fields - property names of dependencies to be merged
 * together.
 * @return {Object} - merged dependencies.
 */
function mergeDependencies (pkgJSON, fields) {
  var allDependencies = {}
  for (var i = 0; i < fields.length; i++) {
    var field = fields[i]
    var dependencies = pkgJSON[field] || {}
    var names = Object.keys(dependencies)
    for (var j = 0; j < names.length; j++) {
      var name = names[j]
      allDependencies[name] = dependencies[name]
    }
  }
  return allDependencies
}

/**
 * extract an array of bundled dependency names from the passed in
 * `package.json`. uses the `bundleDependencies` and `bundledDependencies`
 * properties.
 * @param  {Object} pkgJSON - plain JavaScript object representing a
 * `package.json` file.
 * @return {Array.<String>} - array of bundled dependency names.
 */
function parseBundleDependencies (pkgJSON) {
  var bundleDependencies = (pkgJSON.bundleDependencies || [])
    .concat(pkgJSON.bundledDependencies || [])
  return bundleDependencies
}

/**
 * extract specified dependencies from a specific `package.json`.
 * @param  {Object} pkgJSON - plain JavaScript object representing a
 * `package.json` file.
 * @param  {Array.<String>} fields - array of dependency fields to be followed.
 * @return {Array} - array of dependency pairs.
 */
function parseDependencies (pkgJSON, fields) {
  // bundleDependencies and bundledDependencies are optional. we need to
  // exclude those form the final [name, version] pairs that we're generating.
  var bundleDependencies = parseBundleDependencies(pkgJSON)
  var allDependencies = mergeDependencies(pkgJSON, fields)
  var names = Object.keys(allDependencies)
  var results = []
  for (var i = 0; i < names.length; i++) {
    var name = names[i]
    if (bundleDependencies.indexOf(name) === -1) {
      results.push([name, allDependencies[name]])
    }
  }
  return results
}

function Installer (baseDir) {
  EventEmitter.call(this)
  this.baseDir = path.join(baseDir, 'node_modules')
  this.locks = Object.create(null)
  this.on('resolvedNew', this.handleResolvedNew.bind(this))
  this.on('resolved', this.handleResolved.bind(this))
}

Installer.prototype = Object.create(EventEmitter.prototype)
Installer.prototype.constructor = Installer

Installer.create = function (baseDir, cb) {
  var installer = new Installer(baseDir)
  installer.init(function (err) {
    if (err) return cb(err)
    cb(null, installer)
  })
}

Installer.prototype.init = function (cb) {
  mkdirp(this.baseDir, cb)
}

Installer.prototype.schedule = function (name, version) {
  var self = this

  resolve(name, version, function (error, result) {
    if (error) return self.emit('error', error)

    self.emit('resolved', result)

    // dependency is already being installed.
    if (self.locks[result.shasum]) return
    self.locks[result.shasum] = true

    self.emit('resolvedNew', result)
  })
}

Installer.prototype.handleResolvedNew = function (result) {
  var self = this

  var dependencies = parseDependencies(result.pkgJSON, ['dependencies'])
  for (var i = 0; i < dependencies.length; i++) {
    var dependency = dependencies[i]
    self.schedule(dependency[0], dependency[1])
  }

  var target = path.join(self.baseDir, result.shasum)
  result.download(target, function (error) {
    if (error) return self.emit('error', error)
    self.emit('downloaded', result)
  })
}

Installer.prototype.handleResolved = function (result) {
}

module.exports = Installer
