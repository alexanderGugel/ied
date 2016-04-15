import path from 'path'
import {map} from 'rxjs/operator/map'
import {mergeMap} from 'rxjs/operator/mergeMap'
import {EmptyObservable} from 'rxjs/observable/EmptyObservable'

import * as util from '../util'

/**
 * resolve a dependency's `package.json` file from the local file system.
 * @param  {String} parentTarget - absolute parent's node_modules path.
 * @param  {String} name - name of the dependency.
 * @param  {String} version - version of the dependency.
 * @return {Observable} - observable sequence of `package.json` objects.
 */
export function resolve (parentTarget, name, version) {
  const _path = path.join(parentTarget, 'node_modules', name)
  return util.readlink(_path)::mergeMap((relTarget) => {
    const target = path.resolve(_path, relTarget)
    const filename = path.join(target, 'package.json')
    return util.readFileJSON(filename)::map((pkgJSON) => ({
      parentTarget, pkgJSON, target, _path, fetch: EmptyObservable.create
    }))
  })
}
