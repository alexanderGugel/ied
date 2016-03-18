import init from 'init-package-json'
import path from 'path'

const isWindows = process.platform === 'win32'
const home = process.env[isWindows ? 'USERPROFILE' : 'HOME']

export default function initCmd (cwd, argv) {
  const initFile = path.resolve(home, '.ied-init')

  init(cwd, initFile, function (err, data) {
    if (err) {
      if (err.message === 'canceled') {
        console.log('init canceled!')
        return
      }

      throw err
    }
  })
}

