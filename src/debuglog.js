// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

import util from 'util'

const debugs = {}
let debugEnv

/**
 * Node's `debuglog` function. Not available on older Node versions, therefore
 * copied in for convenience:
 *
 * This is used to create a function which conditionally writes to stderr based
 * on the existence of a `NODE_DEBUG` environment variable. If the `section`
 * name appears in that environment variable, then the returned function will
 * be similar to `console.error()`. If not, then the returned function is a
 * no-op.
 *
 * @param  {String} set - the section of the program to be debugged.
 * @return {Function} - the logging function.
 * @see https://nodejs.org/api/util.html#util_util_debuglog_section
 */
function debuglog (set) {
	if (debugEnv === undefined) {
		debugEnv = process.env.NODE_DEBUG || ''
	}
	set = set.toUpperCase() // eslint-disable-line
	if (!debugs[set]) {
		if (debugEnv === '*' || new RegExp('\\b' + set + '\\b', 'i').test(debugEnv)) { // eslint-disable-line
			const pid = process.pid
			debugs[set] = (...args) => {
				const msg = util.format(...args)
				console.error('%s %d: %s', set, pid, msg)
			}
		} else {
			debugs[set] = Function.prototype
		}
	}
	return debugs[set]
}

export default debuglog
