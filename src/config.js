import path from 'path'

const {env, platform, execPath} = process

/**
 * boolean value indicating whether or not we're running on `win32` (Windows).
 * @type {Boolean}
 */
export const isWindows = platform === 'win32'

/**
 * absolute location of the user's home directory.
 * @type {String}
 */
export const home = env[isWindows ? 'USERPROFILE' : 'HOME']

/**
 * registry endpoint configured via `IED_REGISTRY`, defaults to the npm
 * registry [`https://registry.npmjs.org/`]('https://registry.npmjs.org/').
 * @type {String}
 */
export const registry = env.IED_REGISTRY || 'https://registry.npmjs.org/'

/**
 * cache directory used for storing downloaded package tarballs. configurable
 * via `IED_CACHE_DIR`, default to `.ied_cache` in the user's home directory.
 * @type {String}
 */
export const cacheDir = env.IED_CACHE_DIR || path.join(home, '.ied_cache')

/**
 * directory used for globally installed `node_modules`.
 * configurable via `IED_GLOBAL_NODE_MODULES`, default to `.node_modules` in
 * the user's home directory.
 * @type {String}
 */
export const globalNodeModules = env.IED_GLOBAL_NODE_MODULES ||
  path.join(home, '.node_modules')

/**
 * similar to {@link globalNodeModules}. directory used for symlinks of
 * globally linked executables.
 * configurable via `IED_GLOBAL_BIN`, default to parent of `process.execPath`
 * (location of `node` binary).
 * @type {String}
 */
export const globalBin = env.IED_GLOBAL_BIN || path.resolve(execPath, '..')

/**
 * proxy server endpoint. can be set via `IED_PROXY` or `http_proxy`. optional
 * and default to `null`.
 * @type {String|null}
 */
export const proxy = env.IED_PROXY || env.http_proxy || null

/**
 * how often `ied` should retry HTTP requests before indicating failure.
 * defaults to `5` requests. can be set via `IED_REQUEST_RETRIES`.
 * @type {Number}
 */
export const retries = parseInt(env.IED_REQUEST_RETRIES, 10) || 5

/**
 * shell command used for executing lifecycle scripts (such as `postinstall`).
 * platform dependent: default to `cmd` on Windows, otherwise use `sh`.
 * can be overridden using `IED_SH`.
 * @type {String}
 */
export const sh = env.IED_SH || (platform === 'win32' ? env.comspec || 'cmd' : 'sh')

/**
 * additional flags supplied to the `sh` executable. platform dependent:
 * default to `/d /s /c` on Windows, otherwise use `-c`.
 * can be overridden using `IED_SH_FLAG`.
 * @type {String}
 */
export const shFlag = env.IED_SH_FLAG || (isWindows ? '/d /s /c' : '-c')

/**
 * bearer token used for downloading access restricted packages (scoped
 * modules). this token will be set as `Authorization` header field on all
 * subsequent HTTP requests to the registry, thus exposing a potential
 * **security** risk.
 * @type {String|null}
 */
export const bearerToken = env.IED_BEARER_TOKEN || null

/**
 * HTTP options supplied as part of all subsequent requests. used for exporting
 * generic HTTP options that contain the proxy configuration (if set) and the
 * `Authorization` header.
 * @type {Object}
 */
export const httpOptions = {
	proxy,
	headers: bearerToken
		? { authorization: `Bearer ${bearerToken}` }
		: {}
}
