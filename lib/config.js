'use strict'

var path = require('path')

var isWindows = process.platform === 'win32'
var home = process.env[isWindows ? 'USERPROFILE' : 'HOME']

var config = {
  registry: process.env.NOM_REGISTRY || 'https://registry.npmjs.org/',
  cacheDir: process.env.NOM_CACHE_DIR || path.join(home, '.nom_cache'),
  globalNodeModules: process.env.NOM_GLOBAL_NODE_MODULES || path.join(home, '.node_modules'),
  globalBin: process.env.NOM_GLOBAL_BIN || path.resolve(process.execPath, '..'),
  httpProxy: process.env.NOM_HTTP_PROXY || process.env.HTTP_PROXY || null,
  httpsProxy: process.env.NOM_HTTPS_PROXY || process.env.HTTPS_PROXY || null,
  sh: process.env.NOM_SH || (process.platform === 'win32' ? process.env.comspec || 'cmd' : process.env.SHELL || 'bash'),
  shFlag: process.env.NOM_SH_FLAG || (process.platform === 'win32' ? '/d /s /c' : '-c')
}

module.exports = config
