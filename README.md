[![experimental](http://hughsk.github.io/stability-badges/dist/experimental.svg)](http://github.com/hughsk/stability-badges)
[![Build Status](https://travis-ci.org/alexanderGugel/ied.svg)](https://travis-ci.org/alexanderGugel/ied)

ied (WIP)
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
* allows you to install arbitrary groups of packages, e.g. (`ied install --only otherDeps`, `ied install --only prod`)
* useful utilities, such as `ping`, `config`, `ls`
* allows you to easily start a new sub-shell that allows you to use the scripts exposed by your dependencies without installing them globally via `ied sh`
* supports private registries
* makes it impossible for you to accidentally require sub-dependencies, even though node_modules is completely flat
* completely atomic: `node_modules` is guaranteed to be consistent

Why?
----

The original idea was to implement npm's pre-v3 install algorithm in as few lines as possible. This goal was achieved in [`c4ba56f`](https://github.com/alexanderGugel/ied/tree/c4ba56f7dece738db5b8cb28c20c7f6aa1e64d1d).

Currently the main goal of this project is to provide a more performant alternative to npm. I like npm, but it's just too slow.

Installation
------------

The easiest way to install ied is using [npm](https://www.npmjs.org/):

```
  npm i -g ied
```

Alternatively you can also "bootstrap" ied.
After an initial installation via npm, ied will install its own dependencies:

```
  git clone https://github.com/alexanderGugel/ied ied && cd $_ && make install
```

Usage
-----

```
  ied is a package manager for Node.

  Usage:

    ied command [arguments]

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
    link        link the current package or into it
    unlink      unlink the current package or from it

  Flags:
    -h, --help      show usage information
    -v, --version   print the current version
    -S, --save      update package.json dependencies
    -D, --save-dev  update package.json devDependencies
    -o, --only      install a subset of the dependencies
    -r, --registry  use a custom registry (default: http://registry.npmjs.org/)

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
```

Credits
-------

Some ideas and (upcoming) features of ied are heavily inspired by [**Nix**](http://nixos.org/nix/), a purely functional package manager.

FAQ
---

* What does ied stand for?

  Nothing in particular. It's just easy to type and `mpm` (the original name) was already taken.

License
-------

Licensed under the MIT license.
