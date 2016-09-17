
import {spawn} from 'child_process'
import {Observable} from 'rxjs/Observable'
import {mergeMap} from 'rxjs/operator/mergeMap'
import {retryWhen} from 'rxjs/operator/retryWhen'
import {getTmp} from './cache'
import * as util from './util'
import * as config from './config'
import path from 'path'

import debuglog from './debuglog'

const log = debuglog('git')

function prefixGitArgs () {
	return process.platform === 'win32' ? ['-c', 'core.longpaths=true'] : []
}

function spawnGit (args) {
	log(`executing git with args ${args}`)
	const fullArgs = prefixGitArgs().concat(args || [])
	return spawn('git', fullArgs)
}

/**
 * clone a git repository.
 * @param {string} repo - git repository to clone.
 * @param {string} ref - git reference to checkout.
 * @return {Observable} - observable sequence that will be completed once
 * the git repository has been cloned.
 */
export function clone (repo, ref) {
	return Observable.create((observer) => {
		const tmpDest = getTmp()

		const completeHandler = () => {
			observer.next(tmpDest)
			observer.complete()
		}
		const errorHandler = (err) => {
			log(`failed to clone repository from ${repo}`)
			observer.error(err)
		}
		const args = ['clone', '-b', ref, repo, tmpDest, '--single-branch']
		log(`cloning git repository from ${repo}`)
		const git = spawnGit(args)
		git.on('close', code => (code ? errorHandler() : completeHandler()))
	})
}

/**
 * extract a cloned git repository to destination.
 * @param {string} dest - pathname into which the cloned repository should be
 * extracted.
 * @return {Observable} - observable sequence that will be completed once
 * the cloned repository has been extracted.
 */
export function extract (dest) {
	const {pkgJson, target} = this
	const tmpDest = pkgJson.dist.path
	const where = path.join(dest, '..', config.storageDir, target, 'package')
	return util.rename(tmpDest, where)
		::retryWhen((errors) => errors::mergeMap((error) => {
			if (error.code !== 'ENOENT') {
				throw error
			}
			return util.mkdirp(path.dirname(dest))
		}))
}
