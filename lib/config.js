'use strict'

var path = require('path')

var isWindows = process.platform === 'win32'
var home = process.env[isWindows ? 'USERPROFILE' : 'HOME']

var config = {
  registry: process.env.IED_REGISTRY || 'http://registry.npmjs.org/',
  cacheDir: process.env.IED_CACHE_DIR || path.join(home, '.ied_cache'),
  globalNodeModules: process.env.IED_GLOBAL_NODE_MODULES || path.join(home, '.node_modules'),
  globalBin: process.env.IED_GLOBAL_BIN || path.resolve(process.execPath, '..'),
  sh: process.env.IED_SH || (process.platform === 'win32' ? process.env.ComSpec || 'cmd' : process.env.SHELL || 'bash')
}

module.exports = config
