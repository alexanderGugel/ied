import async from 'async'
import * as link from './link'

function handleError (err) {
  if (err) throw err
}

export default function unlinkCmd (cwd, argv) {
  const deps = argv._.slice(1)

  if (!deps.length) {
    link.unlinkToGlobal(cwd, handleError)
  } else {
    async.each(deps, link.unlinkFromGlobal.bind(null, cwd), handleError)
  }
}
