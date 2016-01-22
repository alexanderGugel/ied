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
