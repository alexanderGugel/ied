ied (WIP)
=========

[![Travis](https://img.shields.io/travis/alexanderGugel/ied.svg)](https://travis-ci.org/alexanderGugel/ied)
[![npm](https://img.shields.io/npm/v/ied.svg)](https://www.npmjs.com/package/ied)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)
[![Join the chat at https://gitter.im/migme/beachball](https://img.shields.io/badge/gitter-join%20chat-brightgreen.svg)](https://gitter.im/alexanderGugel/ied)

An alternative package manager for Node.

* **Concurrent Installations** - `ied` installs sub-dependencies in parallel.
  This means that the download of a dependency might have been completed before
  that of its parent or any of its siblings even started.

* **Correct Caching** - Downloaded packages are being cached locally. Similarly
  to the entry dependencies stored in `node_modules`, they are being identified
  by their checksums. Therefore we can guarantee the consistency of the cache
  itself without (manually) invalidating dependencies (e.g. due to overridden
  version numbers).

* **`node_modules` as CAS** - Packages are always being referenced by their
  *SHA-1* checksums. Therefore a `node_modules` directory can be considered to
  be a [Content Addressable
  Storage](https://en.wikipedia.org/wiki/Content-addressable_storage), meaning
  that packages are being identified by their contents, not by arbitrary
  identifiers, such as package names that are not guaranteed to be unique
  across different registries.

* **Flat `node_modules`** - Due to the *CAS*-based design, conflicts due to
  naming collisions are more or less impossible. Therefore all dependencies can
  be stored in a flat directory structure. Circular dependencies and
  dependencies on different versions of the same packages are still being
  handled correctly.

* **Guaranteed uniqueness** - Since the directory in which a specific package
  is being stored is determined by its *shasum*, identical packages can't
  conflict due to their location in the file system itself. This also means
  that the same dependency won't be installed more than once. Dependencies
  don't need to be explicitly declared as `peerDependencies`, since shared
  sub-dependencies are the default, not an option.

* **Atomic installs** - The atomicity of installs can be ensured on a
  *package-level*. "In progress" downloads are being stored in
  `node_modules/.tmp` and moved into `node_modules` once their download has
  been completed. In order to prevent deadlocks, packages that have circular
  dependencies are exempt from this limitation. In most cases however, the
  `node_modules` directory is *consistent* at any given point in time during
  the main installation procedure.

* **Package names as links** - While packages are being referenced by their
  *shasum* internally, they can still be required via their human-readable
  equivalent name. Package names themselves are simply symbolic links to the
  actual content-addressed package itself. A nice side-effect of this design is
  that in contrast to other package managers, you can not accidentally require
  a sub-dependency that hasn't been installed as such.

* **Semantic Versioning** - [Semantic version numbers](http://semver.org/) are
  being resolved correctly.

* **Arbitrary package groups** - Packages can be grouped into "package groups",
  such as `dependencies` and `devDependencies`. Dependencies can be installed
  exclusively based on the group they are in.


Internals
---------

Under the hood, `ied` maintains an "object database", similar to `git`. Instead
of storing packages by some arbitrary name, a SHA1-checksum is being generated
to approximate their contents. The checksums can not only be used for
guaranteeing a certain level of trust and consistency, but they also simplify
the algorithm through which dependencies are being managed.

The algorithm through which packages are being installed guarantees consistency
through atomic installs. The installation of a package either fails or
succeeds, but at no point in time can a dependency itself be required without
having its own sub-dependencies installed (with the exception of shared
circular dependencies).

The checksum of a package is based on the contents of the package itself, not
of its sub-dependencies. Therefore the validity of a package can be verified by
hashing the package itself. Subsequent dependency updates have no effect of the
generated checksum.

Since `node_modules` is essentially a file-system based content addressable
storage, multiple versions of the same package can co-exist in the same
project. In order to expose dependencies via CommonJS, symbolic links are being
created that reference a specific version of the package. This has multiple
advantages:

1. Undeclared dependencies that have been installed as sub-dependencies of
   "direct" dependencies are unlikely to be required "accidentally".

2. There is no need to "manually" (as in additionally to the installation
   procedure itself) de-duplicate the dependency graph. As long as the
   uniqueness of filenames itself can be guaranteed on an OS-level, it is
   *impossible* to install the same package twice. This does not prevent users
   from installing different versions of the same dependency as long as the
   content is different (whereas a different version declared in the
   `package.json` counts as different contents).

3. Shorter pathnames and less problems due to OS-level limitations (as in
   Windows where the maximum path length is limited).

4. Additional application-level startup performance improvements. `require`
   needs to traverse less directories. A limited number of symbolic links need
   to be followed. This performance improvement is primarily useful for
   continuously running tests, where startup time is actually noticeable for
   larger test suits.


### Directory Structure

The used directory structure is primarily optimized for reducing the amount of
IO interaction with the file system during subsequent installations and
guaranteeing the consistency of installed packages.

A consequence of the
[`require.resolve`](https://nodejs.org/api/modules.html#modules_all_together)
algorithm used by Node, all packages need to be stored in a project-level
`node_modules` directory. This directory is completely flat on a package-level,
meaning that there are no nested packages inside it.

Instead each package is being stored in its content-addressed directory. Such a
directory has two sub-directories:

* **package** - This is where the unpacked package contents is being stored. At
  no point in time will this directory be modified. This enables us to verify
  the integrity of the package at a later point in time by comparing the actual
  checksum to the one defined by other dependents or registries.

* **node_modules** - Sub-dependencies of the dependency installed in `package`
  are being referenced by symbolic links in `node_modules` of the package
  itself. `require.resolve` will fall-back to this level after failing to
  locate a dependency in `package`. This means checked in dependencies are
  still supported, provided that their sub-dependencies are also available
  (anywhere in the dependency graph).

On a project level, the `node_modules` directory contains the fetched packages,
installed dependencies and links that expose the packages to user-land via
`require`.

A comparison of sample directory structures produced by ied, npm 2 and npm 3 is
available as a [GitHub
Gist](https://gist.github.com/alexanderGugel/a10ed5655d366875a280).


Why?
----

The original idea was to implement npm's pre-v3 install algorithm in as few
lines as possible. This goal was achieved in
[`c4ba56f`](https://github.com/alexanderGugel/ied/tree/c4ba56f7dece738db5b8cb28c20c7f6aa1e64d1d).

Currently the main goal of this project is to provide a more performant
alternative to npm.


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

The goal of `ied` is to support ~ 80 per cent of the npm commands that one uses
on a daily basis. Feature parity with npm **other than** with its installation
process itself is not an immediate goal. Raw performance is the primary concern
during the development process.

A global [configuration](lib/config.js) can be supplied via environment
variables. `DEBUG` can be used in order to debug specific sub-systems. The
progress bar will be disabled in that case.

Although `run-script` is supported, lifecycle scripts are not.

At this point in time, the majority of the command API is
[self-documenting](bin/cmd.js). More extensive documentation will be available
once the API is stabilized.

A high-level [USAGE](bin/USAGE.txt) help is also supplied. The main goal is to
keep the API predictable for regular npm-users. This means certain flags, such
as for example `--save`, `--save-dev`, `--only`, are supported.

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

Some ideas and (upcoming) features of `ied` are heavily inspired by
[**Nix**](http://nixos.org/nix/), a purely functional package manager.

FAQ
---

* What does ied stand for?

  Nothing in particular. It's just easy to type and `mpm` (the original name)
  was already taken.

License
-------

Licensed under the MIT license. See [LICENSE](LICENSE.md).

