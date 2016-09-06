import assert from 'assert'
import path from 'path'
import {Observable} from 'rxjs'
import {_do} from 'rxjs/operator/do'
import {concatMap} from 'rxjs/operator/concatMap'
import {entries} from './util'
import {filter} from 'rxjs/operator/filter'
import {fromFs} from './pkg_json'
import {map} from 'rxjs/operator/map'
import {reduce} from 'rxjs/operator/reduce'
import {sh, shFlag} from './config'
import {spawn} from 'child_process'

const logCode = ([code, name, script]) => {
	const prefix = `${name}: \`${script}\``

	switch (code) {
		case 0:
			console.log(`${prefix} succeeded`)
			break
		default:
			console.error(`${prefix} failed (exit status ${code})`)
	}
}

const logAvailable = ({scripts = {}}) => {
	const available = Object.keys(scripts)
	if (available.length) {
		console.log(`available scripts: \n\t${available.join('\n\t')}`)
	} else {
		console.error('no scripts in package.json')
	}
}

export const run = (script, options = {}) =>
	Observable.create((observer) => {
		const args = [shFlag, script]
		const childProcess = spawn(sh, args, options)
		childProcess.on('close', (code) => {
			observer.next(code)
			observer.complete()
		})
		childProcess.on('error', (err) => {
			observer.error(err)
		})
	})

/**
 * run a `package.json` script and the related pre- and postscript.
 * @param {String} cwd - current working directory.
 * @param  {Object} argv - command line arguments.
 * @return {Observable} - observable sequence.
 */
export default (cwd, argv) => {
	const scriptNames = argv._.slice(1)
	const pkgJson = fromFs(cwd)

	// if no script(s) have been specified, log out the available scripts.
	if (!scriptNames.length) {
		return pkgJson::_do(logAvailable)
	}

	const PATH = [path.join(cwd, 'node_modules/.bin'), process.env.PATH]
		.join(path.delimiter)
	const env = {
		...process.env,
		PATH
	}
	const runOptions = {env, stdio: 'inherit'}

	return pkgJson::map(({scripts = {}}) => scripts)
		::entries()
		::filter(([name]) => ~scriptNames.indexOf(name))
		::concatMap(([name, script]) =>
				run(script, runOptions)
					::map(code => ([code, name, script]))
		)
		::_do(logCode)
		::reduce((codes, [code]) => codes + code, 0)
		::_do(code => assert.equal(code, 0, 'exit status != 0'))
}
