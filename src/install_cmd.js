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
import { init as initCache } from './fs_cache'

function logResolved (logLevel, {parentTarget, pkgJSON: {name, version}, target}) {
  if ('debug' === logLevel) {
    parentTarget = path.basename(parentTarget).substr(0, 7)
    target = path.basename(target).substr(0, 7)
    console.log(`resolved ${parentTarget} > ${target}: ${name}@${version}`)
  }
}

/**
 * run the installation command.
 * @param  {String} cwd - current working directory (absolute path).
 * @param  {Object} argv - parsed command line arguments.
 * @return {Observable} - an observable sequence that will be completed once
 * the installation is complete.
 */
export default function installCmd (cwd, argv, cb) {
  let logLevel = false
  if (argv.debug) logLevel = 'debug'
  if (argv.verbose) logLevel = 'info'

  initCache().subscribe(null, null, () => {
    const explicit = !!(argv._.length - 1)
    const updatedPkgJSONs = explicit
      ? entryDep.fromArgv(cwd, argv)
      : entryDep.fromFS(cwd)

    const resolved = updatedPkgJSONs::install.resolveAll(cwd)::skip(1)
      ::filter(({ local }) => !local)
      ::_do(logResolved.bind(null, logLevel))
      ::publishReplay().refCount()

    const linked = resolved::install.linkAll()
    const fetched = resolved::install.fetchAll(logLevel)

    // only build if we're allowed to.
    const built = argv.build
      ? resolved::install.buildAll()
      : EmptyObservable.create()

    cb(linked::merge(fetched)::concat(built))
  })
}
