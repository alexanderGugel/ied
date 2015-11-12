[![experimental](http://hughsk.github.io/stability-badges/dist/experimental.svg)](http://github.com/hughsk/stability-badges)
[![Build Status](https://travis-ci.org/alexanderGugel/mpm.svg)](https://travis-ci.org/alexanderGugel/mpm)

mpm
===

A *roughly* [**npm install**](https://www.npmjs.com/)-compatible package manager for Node.JS in **~200**<sup id="a1">[1](#f1)</sup> lines of code (eLOC).

* implements `npm`'s basic [install algorithm](https://docs.npmjs.com/cli/install#algorithm)
* correctly resolves (circular) dependencies
* supports [semver](http://semver.org/)
* correctly deals with `devDependencies`
* interfaces with the [npm registry](https://www.npmjs.org/)
* **bootstrapping** - That's why `node_modules` is checked in. It's fine, [**really**](https://github.com/npm/npm-www/tree/b166b9c2cda1b49e0d5eb671d660fb0bc9e3683b#design-philosophy).
* **fast** - About twice as fast when installing [express](https://www.npmjs.com/package/express). Benchmarks are flawed. Try yourself and don't blame me.

<small>
  <strong id="f1">1</strong> Well, at least originally [c4ba56f](https://github.com/alexanderGugel/mpm/tree/c4ba56f7dece738db5b8cb28c20c7f6aa1e64d1d). [↩](#a1)
</small>

Installation
------------

```
  git clone https://github.com/alexanderGugel/mpm mpm && cd $_ && make install
```

Usage
-----

```
  mpm is a package manager for Node.

  Usage:

    mpm command [arguments]

  The commands are:

    install     fetch packages and dependencies
    run         run a package.json script
    test        run the test-suite of the current package
    shell       enter a sub-shell with augmented PATH
    ping        check if the registry is up
    ls          print the dependency graph
    config      print the used config

  Flags:
    -h, --help      show usage information
    -v, --version   print the current version
    -S, --save      update package.json dependencies
    -D, --save-dev  update package.json devDependencies
    -o, --only      install a subset of the dependencies
    -r, --registry  use a custom registry (default: http://registry.npmjs.org/)

  Example:
    mpm install <pkg>
    mpm install <pkg>@<version>
    mpm install <pkg>@<version range>

    Can specify one or more: mpm install semver@^5.0.1 tape
    If no argument is supplied, installs dependencies from package.json.
    Sub-commands can also be called via their shorthand aliases.

  README:  https://github.com/alexanderGugel/mpm
  ISSUES:  https://github.com/alexanderGugel/mpm/issues
```

Trivia
------

`mpm` stands for "**m**ad **p**eople **m**atter".

License
-------

Licensed under the MIT license.
