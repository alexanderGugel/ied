# Change Log

All notable changes to this project will be documented in this file.

v2.1.0 / 2016-07-08
==================

This version includes some major improvements to ied, including support for
additional installation targets and major tooling changes.

Linting rules, as well as tests have been extended.

Special thanks to @mgcrea for adding an installation mechanism for GitHub and
tarball dependencies.

  * Merge pull request #148 from mgcrea/patch-npm-update
  * Merge pull request #144 from mgcrea/feat-custom-storage
  * Update dependencies
  * Merge pull request #146 from mgcrea/fix-git-pkg-spec
  * Refactor hosted resolve to support multiple providers, add bitbucket support
  * Add configurable storage directory that defaults to `node_modules/.cas` (fixes #96)
  * Merge pull request #143 from mgcrea/fix-tests
  * Remove .only call to properly test all cases
  * Merge pull request #142 from mgcrea/fix-github-targets
  * Fix and properly test both `file:` and `github:` targets
  * Test link#getSymlinks
  * Merge pull request #138 from mgcrea/refactor-tests
  * Improve coverage with babel-plugin-__coverage__
  * Use ./lib/cmd.js instead of npm in Makefile
  * Revert for-of to forEach switch
  * Rename test/specs to test/spec
  * Split specs and e2e tests, add code coverage via nyc
  * Refactor eslint
  * Refactor unit tests
  * Merge pull request #137 from mgcrea/chore-prune-npm
  * Prune and update dependencies
  * Merge pull request #133 from mgcrea/wip-file-github
  * Include Inch CI docs badge
  * Properly check semver ranges on explicit local installs (fixes #130)
  * Add support for exotic package types (file, hosted, and tarball)

v2.0.5 / 2016-06-21
===================

  * 2.0.5
  * Reinit History
  * Merge pull request #134 from mgcrea/patch-build-node-dtrace-provider
  * Merge pull request #135 from mgcrea/patch-debuglog
  * Merge pull request #136 from mgcrea/chore-travis
  * Test against node@6, only test latest minor
  * Add support for NODE_DEBUG=* to debug everything
  * Build packages in a serialized fashion to prevent race conditions
  * Fix build for specific npm-related edge cases
  * Merge pull request #131 from mgcrea/patch-source-map
  * Merge pull request #132 from mgcrea/fix-debuglog
  * Fix debuglog arguments handling
  * Add inline source maps to compiled lib
  * Merge pull request #128 from SiegfriedEhret/patch-1
  * Update README.md

v2.0.4 / 2016-05-29
===================

  * 2.0.4
  * Use RxJS for version and help command
  * Merge branch 'run-cmd'
  * Fix config tests
  * Rewrite run command using RxJS
  * Use RxJS for unlink command
  * Use RxJS for link command
  * Decouple registry from config
  * Make test a .PHONY task
  * Clean up Makefile
  * Fix registry tests
  * Add .github PR and issue templates
  * Use assert.AssertionError instead of custom errors
  * Refactor debuglog
  * Add ASCII logo to README
  * Add lint to Makefile; Put docs into ./docs
  * Clean up .gitignore

v2.0.3 / 2016-05-27
===================

  * 2.0.3
  * Remove TODO
  * Merge pull request #126 from alexanderGugel/fix-retry
  * Fix retry config var

v2.0.2 / 2016-05-27
===================

  * 2.0.2
  * Add missing dev dependency for mocha tests

v2.0.1 / 2016-05-27
===================

  * 2.0.1
  * Remove spaces before commands

v2.0.0 / 2016-05-27
===================

  * 2.0.0
  * Add CHANGELOG.md
  * Build node_modules before lib
  * Clean up dependencies
  * Remove duplicate test from USAGE
  * Merge branch 'next'
  * Add .files to package.json
  * Add prepublish script
  * Fix dead link lib -> src
  * Fix usage doc
  * Remove FAQ
  * Remove standard style
  * Fix Makefile
  * Define argv types
  * Fetch registry version document
  * Modularize resolve and install
  * Remove ls command
  * Add debuglog
  * Rewrite

v1.1.1 / 2016-04-06
===================

  * 1.1.1
  * Merge pull request #103 from just-boris/patch-1
  * change script phase

v1.1.0 / 2016-03-29
===================

  * 1.1.0
  * Merge pull request #95 from JoshSchreuder/fix-windows-support
  * Merge pull request #87 from just-boris/master
  * Merge pull request #94 from Arnavion/patch-1
  * Use junction as symlink type on Windows
  * expose 'run' module
  * setup Travis to build native packages for Node.js 4 and later
  * add tests on install logic
  * support native packages
  * invoke lifecycle scripts on install
  * Fix travis badge in README to show status of master branch

v1.0.6 / 2016-03-08
===================

  * 1.0.6
  * Merge pull request #90 from just-boris/fix-cache-init
  * do not pass rest of arguments from cache.init()
  * expose: Remove expose command
  * Refactor and cleanup installCmd
  * Handle installCmd error in bin/cmd
  * Move cache init logic to cache
  * Remove unneeded mkdirp before installCmd
  * Refactor install_cmd
  * link: forceSymlink for local installs
  * Reformat link

v1.0.5 / 2016-02-22
===================

  * 1.0.5
  * Merge branch 'refactor'
  * Remove obsolete async.series
  * Remove unused ignore_error.js helper

v1.0.4 / 2016-02-17
===================

  * 1.0.4
  * Minor refactor of install utils

v1.0.3 / 2016-02-17
===================

  * 1.0.3
  * Merge pull request #86 from alexanderGugel/fix-tty
  * Correctly handle case where stderr is not a TTY
  * Refactor resolve to switch
  * Fix typo

v1.0.2 / 2016-02-10
===================

  * 1.0.2
  * Merge pull request #84 from alexanderGugel/dev
  * Extract force_symlink out into force-symlink package

v1.0.1 / 2016-02-10
===================

  * 1.0.1
  * Merge pull request #83 from alexanderGugel/dev
  * Add unit tests for config
  * Add missing 'use strict's
  * Refactor and test cache

v1.0.0 / 2016-02-01
===================

  * 1.0.0
  * Merge pull request #81 from just-boris/master
  * resolve dependency version as tag closes #74

v0.4.11 / 2016-01-30
====================

  * 0.4.11
  * use resolved package version as uid

v0.4.10 / 2016-01-30
====================

  * 0.4.10
  * Merge pull request #66 from rstacruz/sepia
  * Ignore fixtures
  * Perform rm -rf of test artifacts before npm test
  * Use sepia

v0.4.9 / 2016-01-29
===================

  * 0.4.9
  * chmod scripts

v0.4.8 / 2016-01-29
===================

  * 0.4.8
  * Remove WIP from README

v0.4.7 / 2016-01-28
===================

  * 0.4.7
  * Make requestRetries configurable via IED_REQUEST_RETRIES env var

v0.4.6 / 2016-01-28
===================

  * 0.4.6
  * Use got for ping command

v0.4.5 / 2016-01-27
===================

  * 0.4.5
  * Refactor env in run command

v0.4.4 / 2016-01-27
===================

  * 0.4.4
  * Merge pull request #77 from dickeyxxx/url-resolve
  * resolve registry urls
  * fix https registries with ping

v0.4.3 / 2016-01-25
===================

  * 0.4.3
  * Merge pull request #64 from rstacruz/bash-only
  * Always use sh
  * Merge pull request #71 from rstacruz/patch-1
  * Update TODO.md
  * Always use bash (#62)

v0.4.2 / 2016-01-25
===================

  * 0.4.2
  * Merge pull request #73 from just-boris/master
  * gather bin information from package.json

v0.4.1 / 2016-01-21
===================

  * 0.4.1
  * Merge pull request #60 from just-boris/patch-1
  * Skip root folder for cached tarballs as well as in fetch

v0.4.0 / 2016-01-18
===================

  * 0.4.0
  * Merge pull request #58 from mrmlnc/fix-init-error-handler
  * ooops, fix output error for init
  * Merge pull request #57 from mrmlnc/init-error-handler
  * User-friendly error output when exiting from the initialization process
  * Merge pull request #56 from mrmlnc/fix-54
  * the correct path to the home directory in Windows (fix #54)
  * Merge pull request #53 from just-boris/tarballs
  * Merge pull request #50 from just-boris/master
  * install gulp v4 as example of tarball package
  * use got instead of raw http
  * strip root folder in tarballs
  * resolve and download tarballs
  * do not catch errors during callback dispatching

v0.3.6 / 2015-12-10
===================

  * 0.3.6
  * Cleanup README and TODO

v0.3.5 / 2015-12-03
===================

  * 0.3.5
  * Default to HTTPS registry

v0.3.4 / 2015-11-27
===================

  * 0.3.4
  * Fix Makefile to link into $HOME/.node_modules
  * Revert "Remove Makefile"
  * No longer hardcode scoped modules in expose()

v0.3.3 / 2015-11-22
===================

  * 0.3.3
  * Fix install sub-command for scoped packages
  * Test semver of installed package
  * Remove Makefile

v0.3.2 / 2015-11-21
===================

  * 0.3.2
  * Merge branch 'node_v0'
  * Use custom debuglog
  * Resolve linting issues

v0.3.1 / 2015-11-21
===================

  * 0.3.1
  * Fix resolve tests

v0.3.0 / 2015-11-21
===================

  * 0.3.0
  * Add support for running behind a proxy

v0.2.5 / 2015-11-20
===================

  * 0.2.5
  * Remove broken badge

v0.2.4 / 2015-11-20
===================

  * 0.2.4
  * Use correct npm badge in README

v0.2.3 / 2015-11-20
===================

  * 0.2.3
  * Add CODE_OF_CONDUCT, CONTRIBUTING; Improve README
  * Merge pull request #31 from nisaacson/adds-https-support
  * Pull request feedback
  * Adds tests for https protocol
  * Fixes protocol string check
  * Fixes naming conflict
  * Adds https support and reworks linter/test scripts

v0.2.2 / 2015-11-19
===================

  * 0.2.2
  * Fix run sub-command
  * Cleanup and refactor install
  * Add integration test for install

v0.2.1 / 2015-11-18
===================

  * 0.2.1
  * Add support for scoped modules

v0.1.1 / 2015-11-17
===================

  * 0.1.1
  * Refactor linking functionality
  * Add Gitter badge
  * Throw LOCKED error during redundant install

v0.1.0 / 2015-11-16
===================

  * 0.1.0
  * Add link and unlink sub-command
  * Make USAGE.txt and README consistent
  * Merge pull request #9 from chaconnewu/master
  * Add one more example usage in README.md

v0.0.5 / 2015-11-16
===================

  * 0.0.5
  * Add linter

v0.0.4 / 2015-11-16
===================

  * 0.0.4

v0.0.3 / 2015-11-16
===================

  * 0.0.3
  * Use node_modules/.tmp instead of $TMPDIR
  * Make statusCode error messages more useful

v0.0.2 / 2015-11-15
===================

  * 0.0.2
  * Merge pull request #3 from twhid/patch-1
  * Fixed the typo

v0.0.1 / 2015-11-15
===================

  * 0.0.1
  * Fix bug where fetch never called cb
  * Rename to ied
  * Add init sub-command
  * Add expose sub-command
  * Correctly call cb after closed cache write stream
  * Add caching layer to `fetch` step
  * Add config sub-command
  * Update USAGE docs
  * Refactor composed install function

atomic / 2015-11-10
===================

  * Make installation of packages atomic
  * Add --registry flag
  * Extract out sub-commands
  * Add ping sub-command
  * Add global config file
  * Add run command (experimental WIP)
  * Ignore example dir
  * Properly require packages from within themselves
  * Make callback an optional param
  * Add sh command (experimental)
  * Fix flickering progress bar bug
  * Add --only flag
  * Add --save, --save-dev flag
  * Fix build process (now requires sub-commands)
  * Use content-length for progress bar
  * Remove unsupported Node versions from CI
  * Place sub-dependencies higher up in node_modules
  * Add basic progress bar
  * Split out install into generic install and expose
  * Refactor resolve and download
  * Fix Makefile no work on consecutive installs
  * Improve build process
  * Use minimist
  * Update node_modules.tar
  * Cleanup package.json
  * Install devDependencies of package.json
  * Add CI
  * Merge branch 'tests'
  * Add more tests

test / 2015-10-24
=================



v2.0.5 / 2016-06-21
==================

  * Merge pull request #134 from mgcrea/patch-build-node-dtrace-provider
  * Merge pull request #135 from mgcrea/patch-debuglog
  * Merge pull request #136 from mgcrea/chore-travis
  * Test against node@6, only test latest minor
  * Add support for NODE_DEBUG=* to debug everything
  * Build packages in a serialized fashion to prevent race conditions
  * Fix build for specific npm-related edge cases
  * Merge pull request #131 from mgcrea/patch-source-map
  * Merge pull request #132 from mgcrea/fix-debuglog
  * Fix debuglog arguments handling
  * Add inline source maps to compiled lib
  * Merge pull request #128 from SiegfriedEhret/patch-1
  * Update README.md

v2.0.4 / 2016-05-29
===================

  * 2.0.4
  * Use RxJS for version and help command
  * Merge branch 'run-cmd'
  * Fix config tests
  * Rewrite run command using RxJS
  * Use RxJS for unlink command
  * Use RxJS for link command
  * Decouple registry from config
  * Make test a .PHONY task
  * Clean up Makefile
  * Fix registry tests
  * Add .github PR and issue templates
  * Use assert.AssertionError instead of custom errors
  * Refactor debuglog
  * Add ASCII logo to README
  * Add lint to Makefile; Put docs into ./docs
  * Clean up .gitignore

v2.0.3 / 2016-05-27
===================

  * 2.0.3
  * Remove TODO
  * Merge pull request #126 from alexanderGugel/fix-retry
  * Fix retry config var

v2.0.2 / 2016-05-27
===================

  * 2.0.2
  * Add missing dev dependency for mocha tests

v2.0.1 / 2016-05-27
===================

  * 2.0.1
  * Remove spaces before commands

v2.0.0 / 2016-05-27
===================

  * 2.0.0
  * Add CHANGELOG.md
  * Build node_modules before lib
  * Clean up dependencies
  * Remove duplicate test from USAGE
  * Merge branch 'next'
  * Add .files to package.json
  * Add prepublish script
  * Fix dead link lib -> src
  * Fix usage doc
  * Remove FAQ
  * Remove standard style
  * Fix Makefile
  * Define argv types
  * Fetch registry version document
  * Modularize resolve and install
  * Remove ls command
  * Add debuglog
  * Rewrite

v1.1.1 / 2016-04-06
===================

  * 1.1.1
  * Merge pull request #103 from just-boris/patch-1
  * change script phase

v1.1.0 / 2016-03-29
===================

  * 1.1.0
  * Merge pull request #95 from JoshSchreuder/fix-windows-support
  * Merge pull request #87 from just-boris/master
  * Merge pull request #94 from Arnavion/patch-1
  * Use junction as symlink type on Windows
  * expose 'run' module
  * setup Travis to build native packages for Node.js 4 and later
  * add tests on install logic
  * support native packages
  * invoke lifecycle scripts on install
  * Fix travis badge in README to show status of master branch

v1.0.6 / 2016-03-08
===================

  * 1.0.6
  * Merge pull request #90 from just-boris/fix-cache-init
  * do not pass rest of arguments from cache.init()
  * expose: Remove expose command
  * Refactor and cleanup installCmd
  * Handle installCmd error in bin/cmd
  * Move cache init logic to cache
  * Remove unneeded mkdirp before installCmd
  * Refactor install_cmd
  * link: forceSymlink for local installs
  * Reformat link

v1.0.5 / 2016-02-22
===================

  * 1.0.5
  * Merge branch 'refactor'
  * Remove obsolete async.series
  * Remove unused ignore_error.js helper

v1.0.4 / 2016-02-17
===================

  * 1.0.4
  * Minor refactor of install utils

v1.0.3 / 2016-02-17
===================

  * 1.0.3
  * Merge pull request #86 from alexanderGugel/fix-tty
  * Correctly handle case where stderr is not a TTY
  * Refactor resolve to switch
  * Fix typo

v1.0.2 / 2016-02-10
===================

  * 1.0.2
  * Merge pull request #84 from alexanderGugel/dev
  * Extract force_symlink out into force-symlink package

v1.0.1 / 2016-02-10
===================

  * 1.0.1
  * Merge pull request #83 from alexanderGugel/dev
  * Add unit tests for config
  * Add missing 'use strict's
  * Refactor and test cache

v1.0.0 / 2016-02-01
===================

  * 1.0.0
  * Merge pull request #81 from just-boris/master
  * resolve dependency version as tag closes #74

v0.4.11 / 2016-01-30
====================

  * 0.4.11
  * use resolved package version as uid

v0.4.10 / 2016-01-30
====================

  * 0.4.10
  * Merge pull request #66 from rstacruz/sepia
  * Ignore fixtures
  * Perform rm -rf of test artifacts before npm test
  * Use sepia

v0.4.9 / 2016-01-29
===================

  * 0.4.9
  * chmod scripts

v0.4.8 / 2016-01-29
===================

  * 0.4.8
  * Remove WIP from README

v0.4.7 / 2016-01-28
===================

  * 0.4.7
  * Make requestRetries configurable via IED_REQUEST_RETRIES env var

v0.4.6 / 2016-01-28
===================

  * 0.4.6
  * Use got for ping command

v0.4.5 / 2016-01-27
===================

  * 0.4.5
  * Refactor env in run command

v0.4.4 / 2016-01-27
===================

  * 0.4.4
  * Merge pull request #77 from dickeyxxx/url-resolve
  * resolve registry urls
  * fix https registries with ping

v0.4.3 / 2016-01-25
===================

  * 0.4.3
  * Merge pull request #64 from rstacruz/bash-only
  * Always use sh
  * Merge pull request #71 from rstacruz/patch-1
  * Update TODO.md
  * Always use bash (#62)

v0.4.2 / 2016-01-25
===================

  * 0.4.2
  * Merge pull request #73 from just-boris/master
  * gather bin information from package.json

v0.4.1 / 2016-01-21
===================

  * 0.4.1
  * Merge pull request #60 from just-boris/patch-1
  * Skip root folder for cached tarballs as well as in fetch

v0.4.0 / 2016-01-18
===================

  * 0.4.0
  * Merge pull request #58 from mrmlnc/fix-init-error-handler
  * ooops, fix output error for init
  * Merge pull request #57 from mrmlnc/init-error-handler
  * User-friendly error output when exiting from the initialization process
  * Merge pull request #56 from mrmlnc/fix-54
  * the correct path to the home directory in Windows (fix #54)
  * Merge pull request #53 from just-boris/tarballs
  * Merge pull request #50 from just-boris/master
  * install gulp v4 as example of tarball package
  * use got instead of raw http
  * strip root folder in tarballs
  * resolve and download tarballs
  * do not catch errors during callback dispatching

v0.3.6 / 2015-12-10
===================

  * 0.3.6
  * Cleanup README and TODO

v0.3.5 / 2015-12-03
===================

  * 0.3.5
  * Default to HTTPS registry

v0.3.4 / 2015-11-27
===================

  * 0.3.4
  * Fix Makefile to link into $HOME/.node_modules
  * Revert "Remove Makefile"
  * No longer hardcode scoped modules in expose()

v0.3.3 / 2015-11-22
===================

  * 0.3.3
  * Fix install sub-command for scoped packages
  * Test semver of installed package
  * Remove Makefile

v0.3.2 / 2015-11-21
===================

  * 0.3.2
  * Merge branch 'node_v0'
  * Use custom debuglog
  * Resolve linting issues

v0.3.1 / 2015-11-21
===================

  * 0.3.1
  * Fix resolve tests

v0.3.0 / 2015-11-21
===================

  * 0.3.0
  * Add support for running behind a proxy

v0.2.5 / 2015-11-20
===================

  * 0.2.5
  * Remove broken badge

v0.2.4 / 2015-11-20
===================

  * 0.2.4
  * Use correct npm badge in README

v0.2.3 / 2015-11-20
===================

  * 0.2.3
  * Add CODE_OF_CONDUCT, CONTRIBUTING; Improve README
  * Merge pull request #31 from nisaacson/adds-https-support
  * Pull request feedback
  * Adds tests for https protocol
  * Fixes protocol string check
  * Fixes naming conflict
  * Adds https support and reworks linter/test scripts

v0.2.2 / 2015-11-19
===================

  * 0.2.2
  * Fix run sub-command
  * Cleanup and refactor install
  * Add integration test for install

v0.2.1 / 2015-11-18
===================

  * 0.2.1
  * Add support for scoped modules

v0.1.1 / 2015-11-17
===================

  * 0.1.1
  * Refactor linking functionality
  * Add Gitter badge
  * Throw LOCKED error during redundant install

v0.1.0 / 2015-11-16
===================

  * 0.1.0
  * Add link and unlink sub-command
  * Make USAGE.txt and README consistent
  * Merge pull request #9 from chaconnewu/master
  * Add one more example usage in README.md

v0.0.5 / 2015-11-16
===================

  * 0.0.5
  * Add linter

v0.0.4 / 2015-11-16
===================

  * 0.0.4

v0.0.3 / 2015-11-16
===================

  * 0.0.3
  * Use node_modules/.tmp instead of $TMPDIR
  * Make statusCode error messages more useful

v0.0.2 / 2015-11-15
===================

  * 0.0.2
  * Merge pull request #3 from twhid/patch-1
  * Fixed the typo

v0.0.1 / 2015-11-15
===================

  * 0.0.1
  * Fix bug where fetch never called cb
  * Rename to ied
  * Add init sub-command
  * Add expose sub-command
  * Correctly call cb after closed cache write stream
  * Add caching layer to `fetch` step
  * Add config sub-command
  * Update USAGE docs
  * Refactor composed install function
