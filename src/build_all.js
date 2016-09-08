import path from 'path'
import {ArrayObservable} from 'rxjs/observable/ArrayObservable'
import {Observable} from 'rxjs/Observable'
import {_do} from 'rxjs/operator/do'
import {concatMap} from 'rxjs/operator/concatMap'
import {every} from 'rxjs/operator/every'
import {filter} from 'rxjs/operator/filter'
import {inherits} from 'util'
import {map} from 'rxjs/operator/map'
import {mergeMap} from 'rxjs/operator/mergeMap'
import {spawn} from 'child_process'

import * as config from './config'

// names of lifecycle scripts that should be run as part of the installation
// process of a specific package (= properties of `scripts` object in
// `package.json`).
export const LIFECYCLE_SCRIPTS = [
	'preinstall',
	'install',
	'postinstall'
]

// error class used for representing an error that occurs due to a lifecycle
// script that exits with a non-zero status code.
inherits(FailedBuildError, Error)
export function FailedBuildError () {
	Error.captureStackTrace(this, this.constructor)
	this.name = 'FailedBuildError'
	this.message = 'failed to build dependencies'
}

/**
 * build a dependency by executing the given lifecycle script.
 * @param  {String} nodeModules - absolute path of the `node_modules` directory.
 * @param  {Object} dep - dependency to be built.
 * @param  {String} dep.target - relative location of the target directory.
 * @param  {String} dep.script - script to be executed (usually using `sh`).
 * @return {Observable} - observable sequence of the returned exit code.
 */
export const build = nodeModules => ({target, script}) =>
	Observable.create(observer => {
		// some packages do expect a defined `npm_execpath` env, e.g.
		// https://github.com/chrisa/node-dtrace-provider/blob/v0.6.0/scripts/install.js#L19
		const env = {npm_execpath: '', ...process.env}

		env.PATH = [
			path.join(nodeModules, target, 'node_modules', '.bin'),
			path.resolve(__dirname, '..', 'node_modules', '.bin'),
			process.env.PATH
		].join(path.delimiter)

		const childProcess = spawn(config.sh, [config.shFlag, script], {
			cwd: path.join(nodeModules, target, 'package'),
			env,
			stdio: 'inherit'
		})
		childProcess.on('error', (error) => {
			observer.error(error)
		})
		childProcess.on('close', (code) => {
			observer.next(code)
			observer.complete()
		})
	})

/**
 * extract lifecycle scripts from supplied dependency.
 * @param {Dep} dep - dependency to be parsed.
 * @return {Array.<Object>} - array of script targets to be executed.
 */
export const parseLifecycleScripts = ({target, pkgJson: {scripts = {}}}) => {
	const results = []
	for (let i = 0; i < LIFECYCLE_SCRIPTS.length; i++) {
		const name = LIFECYCLE_SCRIPTS[i]
		const script = scripts[name]
		if (script) results.push({target, script})
	}
	return results
}

/**
 * run all lifecycle scripts upon completion of the installation process.
 * ensures that all scripts exit with 0 (success), otherwise an error will be
 * thrown.
 * @param  {String} nodeModules - `node_modules` base directory.
 * @return {Observable} - empty observable sequence that will be completed once
 * all lifecycle scripts have been executed.
 */
export default function buildAll (nodeModules) {
	return this
		::map(parseLifecycleScripts)
		::mergeMap(scripts => ArrayObservable.create(scripts))
		// build dependencies sequentially.
		::concatMap(build(nodeModules))
		::every(code => code === 0)
		::filter(ok => !ok)
		::_do(() => {
			throw new FailedBuildError()
		})
}
