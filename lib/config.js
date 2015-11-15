'use strict'

var os = require('os')
var path = require('path')

var isWindows = process.platform === 'win32'

var config = {
  registry: process.env.IED_REGISTRY || 'http://registry.npmjs.org/',
  cacheDir: process.env.IED_CACHEDIR || path.join(process.env[isWindows ? 'USERPROFILE' : 'HOME'], '.ied_cache'),
  tmpDir: process.env.IED_TMPDIR || os.tmpDir(),
  sh: process.env.IED_SH || (process.platform === 'win32' ? process.env.ComSpec || 'cmd' : process.env.SHELL || 'bash')
}

module.exports = config
