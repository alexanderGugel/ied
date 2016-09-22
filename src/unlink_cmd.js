import {ArrayObservable} from 'rxjs/observable/ArrayObservable'
import {mergeMap} from 'rxjs/operator/mergeMap'
import {unlinkFromGlobal, unlinkToGlobal} from './link'

/**
 * Unlinks one or more previously linked dependencies. can be invoked via
 * `ied unlink`. E.g. `ied unlink browserify tap webpack` would unlink all
 * _three_ dependencies.
 * @param  {Object} config - Config object.
 * @param  {string} cwd - Current working directory.
 * @param  {Object} argv - Parsed command line arguments.
 * @return {Observable} Empty observable sequence.
 */
export default (config, cwd, argv) => {
	const names = argv._.slice(1)

	return names.length
		? ArrayObservable.create(names)
			::mergeMap(name => unlinkFromGlobal(cwd, name))
		: unlinkToGlobal(cwd)
}
