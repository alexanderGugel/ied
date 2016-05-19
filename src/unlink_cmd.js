import async from 'async'
import * as link from './link'

function handleError (err) {
	if (err) throw err
}

/**
 * unlink one or more previously linked dependencies. can be invoked via
 * `ied unlink`. E.g. `ied unlink browserify tap webpack` would unlink all
 * _three_ dependencies.
 * @param  {String} cwd - current working directory.
 * @param  {Object} argv - parsed command line arguments.
 */
export default function unlinkCmd (cwd, argv) {
	const deps = argv._.slice(1)

	if (!deps.length) {
		link.unlinkToGlobal(cwd, handleError)
	} else {
		async.each(deps, link.unlinkFromGlobal.bind(null, cwd), handleError)
	}
}
