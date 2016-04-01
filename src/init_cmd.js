import init from 'init-package-json'
import path from 'path'
import * as config from './config'

export default function initCmd (cwd, argv) {
  const initFile = path.resolve(config.home, '.ied-init')

  init(cwd, initFile, (err) => {
    if (err) {
      if (err.message === 'canceled') {
        console.log('init canceled!')
        return
      }

      throw err
    }
  })
}

