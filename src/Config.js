import path from 'path'

const {env, platform, execPath} = process

export const isWindows = platform === 'win32'
export const home = env[isWindows ? 'USERPROFILE' : 'HOME']
export const registry = env.IED_REGISTRY || 'https://registry.npmjs.org/'
export const cacheDir = env.IED_CACHE_DIR || path.join(home, '.ied_cache')
export const globalNodeModules = env.IED_GLOBAL_NODE_MODULES || path.join(home, '.node_modules')
export const globalBin = env.IED_GLOBAL_BIN || path.resolve(execPath, '..')
export const httpProxy = env.IED_HTTP_PROXY || env.HTTP_PROXY || null
export const httpsProxy = env.IED_HTTPS_PROXY || env.HTTPS_PROXY || null
export const requestRetries = parseInt(env.IED_REQUEST_RETRIES, 10) || 5
export const sh = env.IED_SH || (platform === 'win32' ? env.comspec || 'cmd' : 'sh')
export const shFlag = env.IED_SH_FLAG || (platform === 'win32' ? '/d /s /c' : '-c')
