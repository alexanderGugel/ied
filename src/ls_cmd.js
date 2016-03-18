import archy from 'archy'
import async from 'async'
import fs from 'fs'
import path from 'path'

function filterShasums (entry) {
  return /^[0-9a-f]{40}$/.test(entry)
}

// Equivalent to `npm ls`. Prints the dependency graph.
export default function lsCmd (cwd) {
  // TODO Follow symlinks (sub-dependencies).

  const node_modules = path.join(cwd, 'node_modules')

  async.waterfall([
    fs.readdir.bind(fs, node_modules),
    function (files, cb) {
      cb(null, files.filter(filterShasums))
    },
    function (shasums, cb) {
      async.map(shasums, function (shasum, cb) {
        const pkgJSON = path.join(node_modules, shasum, 'package.json')
        fs.readFile(pkgJSON, 'utf8', function (err, raw) {
          if (!err) {
            let pkg
            try {
              pkg = JSON.parse(raw)
            } catch (e) {
              err = e
            }
          }
          cb(null, { error: err, pkg: pkg, shasum: shasum })
        })
      }, cb)
    },
    function (subDeps, cb) {
      console.log(archy({
        label: path.basename(cwd),
        nodes: subDeps.map(function (dep) {
          return '[' + dep.shasum + '] ' + (dep.error ? dep.error.message : dep.pkg.name + '@' + dep.pkg.version)
        })
      }))
    }
  ])
}
