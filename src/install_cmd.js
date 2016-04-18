import path from 'path'
import {EmptyObservable} from 'rxjs/observable/EmptyObservable'
import {_do} from 'rxjs/operator/do'
import {concat} from 'rxjs/operator/concat'
import {filter} from 'rxjs/operator/filter'
import {merge} from 'rxjs/operator/merge'
import {publishReplay} from 'rxjs/operator/publishReplay'
import {skip} from 'rxjs/operator/skip'

import * as entryDep from './entry_dep'
import * as install from './install'
import * as fsCache from './fs_cache'
import * as util from './util'

/**
 * run the installation command.
 * @param  {String} cwd - current working directory (absolute path).
 * @param  {Object} argv - parsed command line arguments.
 * @return {Observable} - an observable sequence that will be completed once
 * the installation is complete.
 */
export default function installCmd (cwd, argv) {
  const explicit = !!(argv._.length - 1)
  const updatedPkgJSONs = explicit
    ? entryDep.fromArgv(cwd, argv)
    : entryDep.fromFS(cwd)

  const resolved = updatedPkgJSONs
    ::install.resolveAll(cwd)::skip(1)
    ::filter(({ local }) => !local)
    ::publishReplay().refCount()

  const linked = resolved::install.linkAll()
  const fetched = resolved::install.fetchAll()

  // only build if we're asked to.
  const built = argv.build
    ? resolved::install.buildAll()
    : EmptyObservable.create()

  const initialized = util.mkdirp(path.join(cwd, 'node_modules'))

  return fsCache.init()::concat(initialized)
    ::concat(fetched)
    ::concat(linked)
    ::concat(built)
    .subscribe()
}
