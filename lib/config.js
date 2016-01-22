'use strict'

var path = require('path')

var isWindows = process.platform === 'win32'
var home = process.env[isWindows ? 'USERPROFILE' : 'HOME']

var config = {
  registry: process.env.IED_REGISTRY || 'https://registry.npmjs.org/',
  cacheDir: process.env.IED_CACHE_DIR || path.join(home, '.ied_cache'),
  globalNodeModules: process.env.IED_GLOBAL_NODE_MODULES || path.join(home, '.node_modules'),
  globalBin: process.env.IED_GLOBAL_BIN || path.resolve(process.execPath, '..'),
  httpProxy: process.env.IED_HTTP_PROXY || process.env.HTTP_PROXY || null,
  httpsProxy: process.env.IED_HTTPS_PROXY || process.env.HTTPS_PROXY || null,
  requestRetries: 5,
  sh: process.env.IED_SH || (process.platform === 'win32' ? process.env.comspec || 'cmd' : 'bash'),
  shFlag: process.env.IED_SH_FLAG || (process.platform === 'win32' ? '/d /s /c' : '-c')
}

module.exports = config
