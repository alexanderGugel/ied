import {EmptyObservable} from 'rxjs/observable/EmptyObservable'
import {concat} from 'rxjs/operator/concat'
import {merge} from 'rxjs/operator/merge'
import {publishReplay} from 'rxjs/operator/publishReplay'
import {skip} from 'rxjs/operator/skip'

import * as entryDep from './entry_dep'
import * as install from './install'
import * as fsCache from './fs_cache'

/**
 * run the installation command.
 * @param  {String} cwd - current working directory (absolute path).
 * @param  {Object} argv - parsed command line arguments.
 * @return {Observable} - an observable sequence that will be completed once
 * the installation is complete.
 */
export default function installCmd (cwd, argv, logLevel) {
  const isExplicit = Boolean(argv._.length - 1)
  const updatedPkgJSONs = isExplicit
    ? entryDep.fromArgv(cwd, argv)
    : entryDep.fromFS(cwd)

  const resolved = updatedPkgJSONs
    ::install.resolveAll(cwd)::skip(1)
    ::publishReplay().refCount()

  const linked = resolved::install.linkAll()
  const fetched = resolved::install.fetchAll(logLevel)

  // only build if we're allowed to.
  const built = argv.build
    ? resolved::install.buildAll()
    : EmptyObservable.create()

  return fsCache.init()
    ::concat(linked::merge(fetched)::concat(built))
}
