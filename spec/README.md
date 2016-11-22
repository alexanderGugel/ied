Package Installation Using Symbolic Links
=========================================

Overview and Motivation
-----------------------

[npm](https://github.com/npm/npm)'s installation mechanism uses a nested
directory structure relying on Node's `node_modules` fallback.

Due to npm's popularity as a package manager, technology, as well as a company,
this algorithm has been popularized as the only "viable" option for installing
Node.js packages in the past.

While npm 3 famously introduced a flattened dependency graph, a lot of the
original problems remain, including, but in no way limited to:

1. Unpredictable dependency graphs after subsequent installations
2. Significant performance penalty due to "flattening" of dependency graph
3. Redundant dependencies due to partially flattened dependency graph

[`ied`](https://github.com/alexanderGugel/ied), an alternative package manager
for Node.js, as well as its fork `pnpm`, rely on a different, symlink-based
algorithm, which aims to address most of these issues.

As part of this document, this algorithm will be formally specified and
documented.

Node's `require()` call
-----------------------

In order to understand the proposed algorithm, it's essential to understand
Node's module system and way of resolving dependencies.

Node looks for dependencies in `node_modules`, when the specified dependency
couldn't be located, the parent directory's `node_modules` folder will
recursively be traversed until the root of the file system is reached.

This enabled implementors of package managers to create circular dependency
graphs by relying on Node's `require` call "falling back" to the parent
directory.

npm exploits this implementation by creating nested dependency graphs.
Especially npm 2 famously created deeply nested `node_modules` directories that
caused issues due to a limit on the maximum possible file system path under
Windows. Consequently, npm 3 introduced an additional step following a
successful package installation that flattened the dependency graph in question.

Directory Structure
-------------------

The proposed symlink-based installation mechanism handles each package
installation in an isolated manner, which is fundamentally different from the
traditional `node_modules`-fallback based approach, in which the directory
structure implies the dependency graph.

Instead, symbolic links can be used in order to **explicitly** define
dependencies.

E.g. a dependency graph in which a depends on b and c and b, can be expressed
using the following directory structure:

```js
[I] ~/g/s/g/a/i/sandbox (master) $ tree node_modules/
node_modules/
├── a
│   └── node_modules
│       ├── b -> ../../b
│       └── c -> ../../c
├── b
└── c

6 directories, 0 files
```

<a href="http://www.youtube.com/watch?feature=player_embedded&v=mNhZrd1VgPs
" target="_blank"><img src="http://img.youtube.com/vi/mNhZrd1VgPs/0.jpg"
alt="Alexander Gugel - Node.js Live London" width="240" height="180" border="10" /></a>

Linking packages instead of copying gives several advantages:

1. packages can be shared between several projects
2. the structure of node_modules is the same as the structure of the dependency tree
3. there are no long path names in node_modules (there is a limit on the path length on Windows)

Installation Mechanism
----------------------

The following section outlines a "MVP" installation mechanism. The goal is not
to focus on the underlying logic of the used resolvers (such as GitHub, npm,
tarball, etc.), but to describe handling of circular dependencies and other edge
cases that might arise from using the proposed algorithm.

Installing dependencies is by definition a recursive problem. A dependency
depends on **n** dependencies that might themselves depend on more dependencies.
Including, but not limited to the dependency itself or an "ancestor" dependency.

An "ancestor" dependency is a dependency that (implicitly) depends on a the
current dependency, thus causing a circular dependency.

Known issues
------------

### Plugins

Many widely used and popular Node projects are pluggable (babel, eslint, etc). By default, Node.js uses the real paths of the modules. So `__dirname` and `__filename` will always be the same, for any of the symlinked packages. This is fine, with a traditional node_modules that has directories, not symlinks. However, when all the packages are in a store and node_modules has only symlinks, packages can't find their plugins.

Luckily, starting from v6.3.0, Node.js has a CLI option to preserve symlinks when resolving modules ([--preserve-symlinks](https://nodejs.org/api/cli.html#cli_preserve_symlinks)).

### Nested dependency tree

npm@3 flattens the dependencies in node_modules. As a consequence, packages get available via require, when they shouldn't be. Lets say `a` depends on `b` and `b` on `c`. In that case in the node_modules of `a`, both `b` and `c` will be in the root. As a consequence, `require('c')` will work in `a`, even though `a` does not depend on `c`.

Symlinked node_modules don't have to be flat. They have the natural nested structure and as a consequence, only packages that are really in the dependencies are accessible.

Unfortunately though, some packages intentionally or not but rely on the flat node_modules structure created by npm@3. Such packages won't work with a symlinked node_modules.