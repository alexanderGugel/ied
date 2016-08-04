// import {retry} from 'rxjs/operator/retry'
// ::retry(retries)
// , retries

import {ErrorObservable} from 'rxjs/observable/ErrorObservable'
import {ignoreElements} from 'rxjs/operator/ignoreElements'
import {mergeMap} from 'rxjs/operator/mergeMap'
import {filter} from 'rxjs/operator/filter'
import {_catch} from 'rxjs/operator/catch'

import path from 'path'

import {stat} from './util'

function distinctId () {
	const values = Object.create(null)
	return this::filter(({id}) => {
		if (values[id]) {
			return false
		}
		values[id] = true
		return true
	})
}

export default function (dir) {
	return this
		::distinctId()
		::mergeMap(({fetch, id, pkgJson}) => {
			const pkgDir = path.join(dir, id, 'pkg')
			return stat(pkgDir)
				::ignoreElements()
				::_catch(err => (
					err.code === 'ENOENT'
					? fetch(dir, id, pkgJson)
					: ErrorObservable.create(err)
				))
		})
		// TODO cache here instead of registry_strategy
}
