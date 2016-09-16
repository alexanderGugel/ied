import init from 'init-package-json'
import path from 'path'
import {Observable} from 'rxjs/Observable'

/**
 * Initializes a new `package.json` file.
 * @see https://www.npmjs.com/package/init-package-json
 */
export default ({home}) => cwd =>
	Observable.create(observer => {
		const initFile = path.resolve(home, '.ied-init')

		init(cwd, initFile, (err) => {
			if (err && err.message !== 'canceled') {
				observer.error(err)
			} else {
				observer.complete()
			}
		})
	})
