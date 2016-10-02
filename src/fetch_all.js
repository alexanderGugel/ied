import {distinctKey} from 'rxjs/operator/distinctKey'
import {mergeMap} from 'rxjs/operator/mergeMap'

export default function (nodeModules) {
	return this
		::distinctKey('id')
		::mergeMap(dep => dep.fetch(nodeModules))
}
