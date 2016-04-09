import {share} from 'rxjs/operator/share'
import {_do} from 'rxjs/operator/do'
import {skip} from 'rxjs/operator/skip'
import {merge} from 'rxjs/operator/merge'
import * as entryDep from './entry_dep'
import {resolveAll, fetchAll, linkAll} from './install'

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

  const resolved = updatedPkgJSONs::resolveAll(cwd)::skip(1)
    ::_do(({pkgJSON: {name, version}}) => {
      console.log(`resolved ${name}@${version}`)
    })

  const sharedResolved = resolved::share()

  // const fetched = resolved::filter(({ local }) => !local)::fetchAll()
  const linked = sharedResolved::linkAll()

  return linked

  // return linked::merge(fetched)
}
