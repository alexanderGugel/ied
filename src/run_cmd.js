import path from 'path'
import assert from 'assert'
import {readFile, entries} from './util'
import {concatMap} from 'rxjs/operator/concatMap'
import {Observable} from 'rxjs'
import {map} from 'rxjs/operator/map'
import {filter} from 'rxjs/operator/filter'
import {reduce} from 'rxjs/operator/reduce'
import {_do} from 'rxjs/operator/do'
import {spawn} from 'child_process'
import {sh, shFlag} from './config'

/**
 * run a `package.json` script and the related pre- and postscript.
 * @param {String} cwd - current working directory.
 * @param  {Object} argv - command line arguments.
 * @return {Observable} - observable sequence.
 */
export default function runCmd (cwd, argv) {
	const scripts = argv._.slice(1)

	const pkgJson = readFile(path.join(cwd, 'package.json'), 'utf8')
		::map(JSON.parse)

	// if no script(s) have been specified, log out the available scripts.
	if (!scripts.length) {
		return pkgJson::_do(logAvailable)
	}

	const PATH = [path.join(cwd, 'node_modules/.bin'), process.env.PATH]
		.join(path.delimiter)
	const env = {...process.env, PATH}
	const runOptions = {env, stdio: 'inherit'}

	return pkgJson::map(({scripts = {}}) => scripts)::entries() // eslint-disable-line no-shadow
		::filter(([name]) => ~scripts.indexOf(name))
		::concatMap(([name, script]) => run(script, runOptions)
			::map((code) => ([name, script, code])))
		::_do(logCode)
		::reduce((codes, [name, script, code]) => codes + code, 0)
		::_do((code) => assert.equal(code, 0, 'exit status != 0'))
}

export function run (script, options = {}) {
	return Observable.create((observer) => {
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
}

function logCode ([name, script, code]) {
	const prefix = `${name}: \`${script}\``
	if (code === 0) console.log(`${prefix} succeeded`)
	else console.error(`${prefix} failed (exit status ${code})`)
}

function logAvailable ({scripts = {}}) {
	const available = Object.keys(scripts)
	if (available.length) {
		console.log(`available scripts: ${available.join(', ')}`)
	} else {
		console.log('no scripts in package.json')
	}
}
