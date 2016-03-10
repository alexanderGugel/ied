'use strict'

var path = require('path')

function Config (process) {
  var isWindows = process.platform === 'win32'
  var home = process.env[isWindows ? 'USERPROFILE' : 'HOME']

  this.registry = process.env.IED_REGISTRY || 'https://registry.npmjs.org/'
  this.cacheDir = process.env.IED_CACHE_DIR || path.join(home, '.ied_cache')
  this.globalNodeModules = process.env.IED_GLOBAL_NODE_MODULES || path.join(home, '.node_modules')
  this.globalBin = process.env.IED_GLOBAL_BIN || path.resolve(process.execPath, '..')
  this.httpProxy = process.env.IED_HTTP_PROXY || process.env.HTTP_PROXY || null
  this.httpsProxy = process.env.IED_HTTPS_PROXY || process.env.HTTPS_PROXY || null
  this.requestRetries = parseInt(process.env.IED_REQUEST_RETRIES, 10) || 5
  this.sh = process.env.IED_SH || (process.platform === 'win32' ? process.env.comspec || 'cmd' : 'sh')
  this.shFlag = process.env.IED_SH_FLAG || (process.platform === 'win32' ? '/d /s /c' : '-c')
}

module.exports = new Config(process)
