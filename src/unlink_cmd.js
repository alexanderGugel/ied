import {ArrayObservable} from 'rxjs/observable/ArrayObservable'
import {mergeMap} from 'rxjs/operator/mergeMap'
import {unlinkFromGlobal, unlinkToGlobal} from './link'

/**
 * unlink one or more previously linked dependencies. can be invoked via
 * `ied unlink`. E.g. `ied unlink browserify tap webpack` would unlink all
 * _three_ dependencies.
 * @param  {String} cwd - current working directory.
 * @param  {Object} argv - parsed command line arguments.
 * @return {Observable} - observable sequence.
 */
export default function unlinkCmd (cwd, argv) {
	const names = argv._.slice(1)

	return names.length
		? ArrayObservable.create(names)
			::mergeMap((name) => unlinkFromGlobal(cwd, name))
		: unlinkToGlobal(cwd)
}
