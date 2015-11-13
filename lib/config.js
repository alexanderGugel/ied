'use strict'

var os = require('os')
var path = require('path')

var isWindows = process.platform === 'win32'

var config = {
  registry: process.env.MPM_REGISTRY || 'http://registry.npmjs.org/',
  cacheDir: process.env.MPM_CACHEDIR || path.join(process.env[isWindows ? 'USERPROFILE' : 'HOME'], '.mpm_cache'),
  tmpDir: process.env.MPM_TMPDIR || os.tmpDir(),
  sh: process.env.MPM_SH || (process.platform === 'win32' ? process.env.ComSpec || 'cmd' : process.env.SHELL || 'bash')
}

module.exports = config
