import path from 'path'
import async from 'async'
import child_process from 'child_process'
import xtend from 'xtend'
import {sh, shFlag} from './config'

/**
 * run a `package.json` script.
 * @param {String} cwd - current working directory.
 * @param  {Object} argv - command line arguments.
 */
export default function run (cwd, argv) {
  const scripts = argv._.slice(1)
  const pkg = require(path.join(cwd, 'package.json'))

  if (!scripts.length) {
    const availableScripts = Object.keys(pkg.scripts || [])
    console.log('Available scripts: ' + availableScripts.join(', '))
    return
  }

  const env = xtend(process.env, {
    PATH: [
      path.join(cwd, 'node_modules/.bin'), process.env.PATH
    ].join(path.delimiter)
  })

  async.mapSeries(scripts, function execScript (scriptName, cb) {
    const scriptCmd = pkg.scripts[scriptName]
    if (!scriptCmd) return cb(null, null)
    const childProcess = child_process.spawn(sh, [shFlag, scriptCmd], {
      env: env,
      stdio: 'inherit'
    })
    childProcess.on('close', cb.bind(null, null))
    childProcess.on('error', cb)
  }, function (err, statuses) {
    if (err) throw err
    const info = scripts.map(function (script, i) {
      return script + ' exited with status ' + statuses[i]
    }).join('\n')
    console.log(info)
    const success = statuses.every(function (code) { return code === 0 })
    process.exit(success | 0)
  })
}
