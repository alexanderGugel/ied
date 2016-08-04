import {EmptyObservable} from 'rxjs/observable/EmptyObservable'
import {ErrorObservable} from 'rxjs/observable/ErrorObservable'
import {map} from 'rxjs/operator/map'
import {mergeStatic} from 'rxjs/operator/merge'
import {reduce} from 'rxjs/operator/reduce'
import {_catch} from 'rxjs/operator/catch'
import {_finally} from 'rxjs/operator/finally'

import path from 'path'

import {readlink} from './util'
import {fromFs} from './pkg_json'

/**
 * noop.
 * @return {EmptyObservable} empty observable.
 */
const fetch = () => EmptyObservable.create()

/**
 * handles a Node.js error. if the error is ENONENT, the error will be ignored
 * by returning an empty observable sequence, thus indirectly invoking the next
 * installation strategy.
 * @param  {Error} err - error to be handled.
 * @return {EmptyObservable|ErrorObservable} resulting observable sequence.
 */
const handleErr = err => (
	err.code === 'ENOENT'
		? EmptyObservable.create()
		: ErrorObservable.create(err)
)

export default (dir, pId) => name => {
	const linkname = path.join(dir, pId, 'node_modules', name)

	const id$ = readlink(linkname)
		::map(link => ({id: path.basename(path.dirname(link))}))

	const pkgJson$ = fromFs(linkname)
		::map(pkgJson => ({pkgJson}))

	return mergeStatic(id$, pkgJson$)
		::reduce((result, x) => ({...result, ...x}), {fetch})
		::_catch(handleErr)
		::_finally(() => console.log('fin: local: resolve', name))
}
