[![experimental](http://hughsk.github.io/stability-badges/dist/experimental.svg)](http://github.com/hughsk/stability-badges)

mpm
===

A *roughly* [**npm install**](https://www.npmjs.com/)-compatible package manager for Node.JS in **~80** lines of code.

* implements `npm`'s basic [install algorithm](https://docs.npmjs.com/cli/install#algorithm)
* correctly resolves (circular) dependencies
* supports [semver](http://semver.org/)
* correctly deals with `devDependencies`
* interfaces with the [npm registry](https://www.npmjs.org/)
* bootstrapping - installs its own dependencies
* **fast** - about twice as fast when installing [express](https://www.npmjs.com/package/express). Benchmarks are flawed. Try yourself.

Installation
------------

```
  git clone https://github.com/alexanderGugel/mpm mpm && cd $_ && make install
```

Usage
-----

```
  mpm - An alternative package manager for Node.js

  Usage:
    mpm
    mpm <pkg>
    mpm <pkg>@<version>
    mpm <pkg>@<version range>

    Can specify one or more: mpm install semver@^5.0.1 tape
    If no argument is supplied, installs dependencies from package.json.

  Flags:
    -h, --help  Show usage information and exit

  README:  https://github.com/alexanderGugel/mpm
  ISSUES:  https://github.com/alexanderGugel/mpm/issues
```

Dependencies
------------

The dependencies are checked into the repo. `mpm` it fully bootstrapping and does not rely on `npm` to install its dependencies.

* [`semver`](https://www.npmjs.com/package/semver)
* [`mkdirp`](https://www.npmjs.com/package/mkdirp)
* [`gunzip-maybe`](https://www.npmjs.com/package/gunzip-maybe)
* [`tar-fs`](https://www.npmjs.com/package/tar-fs)

Trivia
------

`mpm` stands for "**m**ad **p**eople **m**atter".

License
-------

See [LICENSE.md](LICENSE.md).
