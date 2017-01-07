package main

import "github.com/Sirupsen/logrus"

var usage = `
  ied is a package manager for CommonJS packages.

  Usage:
    ied <command> [<args>]

  Commands:
    install     fetch packages and dependencies
    run         run a package.json script
    shell       enter a sub-shell with augmented PATH
    ping        check if the registry is up
    config      print the used config
    init        initialize a new package
    link        link the current package or into it
    unlink      unlink the current package or from it
    start       runs the start script
    stop        runs the stop script
    build       runs the build script
    test        runs the test script

  Example:
    ied install
    ied install <pkg>
    ied install <pkg>@<version>
    ied install <pkg>@<version range>

    Can specify one or more: ied install semver@^5.0.1 tape
    If no argument is supplied, installs dependencies from package.json.
    Sub-commands can also be called via their shorthand aliases.

  README:  https://github.com/alexanderGugel/ied
  ISSUES:  https://github.com/alexanderGugel/ied/issues
`

func helpCmd () {
  logrus.Println(usage)
}
