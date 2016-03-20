import async from 'async'
import * as link from './link'
import * as config from './config'
import mkdirp from 'mkdirp'
import path from 'path'

function handleError (err) {
  if (err) throw err
}

export default function run (cwd, argv) {
  var deps = argv._.slice(1)
  if (!deps.length) {
    async.series([
      mkdirp.bind(null, config.globalNodeModules),
      mkdirp.bind(null, config.globalBin),
      link.linkToGlobal.bind(null, cwd)
    ], handleError)
  } else {
    async.series([
      mkdirp.bind(null, path.join(cwd, 'node_modules')),
      async.each.bind(null, deps, link.linkFromGlobal.bind(null, cwd))
    ], handleError)
  }
}
