import path from 'path'
import config from './config'
import assign from 'object-assign'
import child_process from 'child_process'

/**
 * enter a new session that has access to the CLIs exposed by the installed
 * packages by using an amended `PATH`.
 * @param {String} cwd - current working directory.
 */
export default function shellCmd (cwd) {
  const env = assign({}, process.env, {
    PATH: [
      path.join(cwd, 'node_modules/.bin'), process.env.PATH
    ].join(path.delimiter)
  })

  child_process.spawn(config.sh, [], {
    stdio: 'inherit',
    env: env
  })
}
