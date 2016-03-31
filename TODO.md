TODO
====

Must
----

- [x] integration tests (unit tests due to current pace no longer maintainable)
- [ ] fix dead-lock issue that prevents us from completely atomic installs
  (where the callback actually means **something**)

npm feature parity
------------------

- [ ] allow running `npm` and `ied` in the same project
- [ ] lifecycle scripts (including native dependencies)
- [ ] global **installs** (without `link`)
- [x] allow declaring dependencies as tarball
- [ ] allow declaring dependencies as git repo

Wild Ideas
----------

- [ ] install from BitTorrent (via DHT) (--> use as distributed cache)
- [ ] ARC
- [ ] multi threaded fetch (optimize decompression)
- [ ] NixOS like rollback


function updatePkgJSONs (argv) {
  return this::map((outdatedPkgJSON) => {
    const newDepNames = argv._.slice(1)
    if (!newDepNames.length) return outdatedPkgJSON

    const newDeps = fromPairs(newDepNames.map((target) => {
      const nameVersion = /^(@?.+?)(?:@(.+)?)?$/.exec(target)
      return [ nameVersion[1], nameVersion[2] || '*' ]
    }))

    const diff = argv.saveDev
      ? { devDependencies: xtend(outdatedPkgJSON.devDependencies || {}, newDeps) }
      : { dependencies: xtend(outdatedPkgJSON.dependencies || {}, newDeps) }

    return xtend(outdatedPkgJSON, diff)
  })
}

function saveUpdatedPkgJSON (cwd) {
  const filename = path.join(cwd, 'package.json')
  return this::mergeMap((pkgJSON) =>
    writeFile(filename, JSON.stringify(pkgJSON, null, 2) + '\n', 'utf8')
  )
}
