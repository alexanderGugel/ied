import path from 'path'

export const isWindows = process.platform === 'win32'
export const home = process.env[isWindows ? 'USERPROFILE' : 'HOME']
export const registry = process.env.IED_REGISTRY || 'https://registry.npmjs.org/'
export const cacheDir = process.env.IED_CACHE_DIR || path.join(home, '.ied_cache')
export const globalNodeModules = process.env.IED_GLOBAL_NODE_MODULES || path.join(home, '.node_modules')
export const globalBin = process.env.IED_GLOBAL_BIN || path.resolve(process.execPath, '..')
export const httpProxy = process.env.IED_HTTP_PROXY || process.env.HTTP_PROXY || null
export const httpsProxy = process.env.IED_HTTPS_PROXY || process.env.HTTPS_PROXY || null
export const requestRetries = parseInt(process.env.IED_REQUEST_RETRIES, 10) || 5
export const sh = process.env.IED_SH || (process.platform === 'win32' ? process.env.comspec || 'cmd' : 'sh')
export const shFlag = process.env.IED_SH_FLAG || (process.platform === 'win32' ? '/d /s /c' : '-c')
