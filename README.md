[![experimental](http://hughsk.github.io/stability-badges/dist/experimental.svg)](http://github.com/hughsk/stability-badges)
[![Build Status](https://travis-ci.org/alexanderGugel/mpm.svg)](https://travis-ci.org/alexanderGugel/mpm)

mpm (WIP)
=========

An alternative package manager for Node.

* blazingly **fast** due to completely concurrent installation procedure and constant (micro) optimizations
* correctly resolves (circular) dependencies
* supports [semver](http://semver.org/)
* correctly handles `devDependencies`
* produces a flat node_modules directory
* verifies the integrity of downloaded packages
* **fast** caching
* interfaces with the [npm registry](https://www.npmjs.org/)
* has no global namespace for packages
* allows you to `require` multiple *versions* of the **same** package
* visually indicates progress via progress bar
* respects your global **configuration**
* can run arbitrary scripts defined in your `package.json` (e.g. `test`)
* supports the usual `install` flags, such as `--save`, `--save-dev`
* allows you to install arbitrary groups of packages, e.g. (`mpm install --only otherDeps`, `mpm install --only prod`)
* useful utilities, such as `ping`, `config`, `ls`
* allows you to easily start a new sub-shell that allows you to use the scripts exposed by your dependencies without installing them globally via `mpm sh`
* supports private registries
* makes it impossible for you to accidentally require sub-dependencies, even though node_modules is completely flat
* completely atomic: `node_modules` is guaranteed to be consistent

Why?
----

The original idea was to implement npm's pre-v3 install algorithm in as few lines as possible. This goal was achieved in [`c4ba56f`](https://github.com/alexanderGugel/mpm/tree/c4ba56f7dece738db5b8cb28c20c7f6aa1e64d1d).

Currently the main goal of this project is to provide a more performant alternative to npm. I like npm, but it's just too slow.

Installation
------------

```
  git clone https://github.com/alexanderGugel/mpm mpm && cd $_ && make install
```

`mpm` is currently not published to the npm registry, mostly because the name is going to be changed.

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
    expose      make a sub-dependency `require`able
    config      print the used config
    init        initialize a new package

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

Credits
-------

Some ideas and (upcoming) features of mpm are heavily inspired by [**Nix**](http://nixos.org/nix/), a purely functional package manager.

Trivia
------

`mpm` stands for "**m**ad **p**eople **m**atter".

License
-------

Licensed under the MIT license.
