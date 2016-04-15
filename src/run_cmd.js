import path from 'path'
import async from 'async'
import child_process from 'child_process'
import xtend from 'xtend'
import {sh, shFlag} from './config'

/**
 * run a `package.json` script and the related pre- and postscript.
 * @param {String} cwd - current working directory.
 * @param  {Object} argv - command line arguments.
 */
export default function runCmd (cwd, argv) {
  const scripts = argv.command
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

  async.mapSeries(scripts, (scriptName, cb) => {
    const scripts = [
      `pre${scriptName}`,
      scriptName,
      `post${scriptName}`
    ]

    const scriptCmds = scripts.map((scriptName) => {
      return pkg.scripts[scriptName]
    }).filter((scriptCmd) => {
      if (!scriptCmd) return cb(new Error(`Missing script: ${scriptName}`), null)
      return scriptCmd
    })

    if (!scriptCmds.length) return cb(null, null)

    async.mapSeries(scriptCmds, (scriptCmd, cb) => {
      const childProcess = child_process.spawn(sh, [shFlag, scriptCmd], {
        env: env,
        stdio: 'inherit'
      })
      childProcess.on('close', cb.bind(null, null))
      childProcess.on('error', cb)
    }, cb)
  }, function (err, statuses) {
    if (err) throw err
    const info = scripts.map((script, i) => {
      const scriptStatus = statuses[i].every((code) => { return code === 0 })
      return `${script} exited with status ${scriptStatus ? 0 : 1}`
    }).join('\n')
    console.log(info)

    const flattenedStatuses = [].concat.apply([], statuses)
    const success = flattenedStatuses.every((code) => { return code === 0 })
    process.exit(success ? 0 : 1)
  })
}
