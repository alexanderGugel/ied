import path from 'path'

const {env, platform, execPath} = process

/**
 * Boolean value indicating whether or not we're running on `win32` (Windows).
 * @type {boolean}
 */
export const isWindows = platform === 'win32'

/**
 * Absolute location of the user's home directory.
 * @type {string}
 */
export const home = env[isWindows ? 'USERPROFILE' : 'HOME']

/**
 * Registry endpoint configured via `IED_REGISTRY`, defaults to the npm
 * registry [`https://registry.npmjs.org/`]('https://registry.npmjs.org/').
 * @type {string}
 */
export const registry = env.IED_REGISTRY || 'https://registry.npmjs.org/'

/**
 * Cache directory used for storing downloaded package tarballs. Configurable
 * via `IED_CACHE_DIR`, default to `.ied_cache` in the user's home directory.
 * @type {string}
 */
export const cacheDir = env.IED_CACHE_DIR || path.join(home, '.ied_cache')

/**
 * Directory used for globally installed `node_modules`.
 * Configurable via `IED_GLOBAL_NODE_MODULES`, default to `.node_modules` in
 * the user's home directory.
 * @type {string}
 */
export const globalNodeModules = env.IED_GLOBAL_NODE_MODULES ||
  path.join(home, '.node_modules')

/**
 * Similar to {@link globalNodeModules}. directory used for symlinks of
 * globally linked executables.
 * Configurable via `IED_GLOBAL_BIN`, default to parent of `process.execPath`
 * (location of `node` binary).
 * @type {string}
 */
export const globalBin = env.IED_GLOBAL_BIN || path.resolve(execPath, '..')

/**
 * Proxy server endpoint. Can be set via `IED_PROXY` or `http_proxy`. Optional
 * and might be set to `null`.
 * @type {string|null}
 */
export const proxy = env.IED_PROXY || env.http_proxy || null

/**
 * How often `ied` should retry HTTP requests before indicating failure.
 * Defaults to `5` requests, but can be configured via `IED_REQUEST_RETRIES`.
 * @type {Number}
 */
export const retries = parseInt(env.IED_REQUEST_RETRIES, 10) || 5

/**
 * Shell command used for executing lifecycle scripts (such as `postinstall`).
 * Platform dependent: Defaults to `cmd` on Windows, otherwise uses `sh`.
 * cCan be overridden using `IED_SH`.
 * @type {string}
 */
export const sh = env.IED_SH || env.SHELL || (platform === 'win32' ? env.comspec || 'cmd' : 'sh')

/**
 * Additional flags supplied to the `sh` executable. platform dependent:
 * default to `/d /s /c` on Windows, otherwise use `-c`.
 * Can be overridden using `IED_SH_FLAG`.
 * @type {string}
 */
export const shFlag = env.IED_SH_FLAG || (isWindows ? '/d /s /c' : '-c')

/**
 * Bearer token used for downloading access restricted packages (scoped
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
		? {authorization: `Bearer ${bearerToken}`}
		: {}
}
