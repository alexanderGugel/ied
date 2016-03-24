import path from 'path'
import {sh} from './config'
import assign from 'object-assign'
import child_process from 'child_process'

export default function shellCmd (cwd) {
  const env = assign({}, process.env, {
    PATH: [
      path.join(cwd, 'node_modules/.bin'), process.env.PATH
    ].join(path.delimiter)
  })

  child_process.spawn(sh, [], {
    stdio: 'inherit',
    env: env
  })
}
