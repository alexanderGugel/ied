import path from 'path'

export class Config {
  constructor (process) {
    const {env, platform, execPath} = process

    this.isWindows = platform === 'win32'
    this.home = env[this.isWindows ? 'USERPROFILE' : 'HOME']
    this.registry = env.IED_REGISTRY || 'https://registry.npmjs.org/'
    this.cacheDir = env.IED_CACHE_DIR || path.join(this.home, '.ied_cache')
    this.globalNodeModules = env.IED_GLOBAL_NODE_MODULES || path.join(this.home, '.node_modules')
    this.globalBin = env.IED_GLOBAL_BIN || path.resolve(execPath, '..')
    this.httpProxy = env.IED_HTTP_PROXY || env.HTTP_PROXY || null
    this.httpsProxy = env.IED_HTTPS_PROXY || env.HTTPS_PROXY || null
    this.requestRetries = parseInt(env.IED_REQUEST_RETRIES, 10) || 5
    this.sh = env.IED_SH || (platform === 'win32' ? env.comspec || 'cmd' : 'sh')
    this.shFlag = env.IED_SH_FLAG || (platform === 'win32' ? '/d /s /c' : '-c')
  }
}

export default new Config(process)
