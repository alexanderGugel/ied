# Store Spec

> draft, store spec version 1

A store is a folder that contains packages and information about projects that are using them.
The store does not include the `node_modules` folder of any of the packages, unless it has
[bundled dependencies](https://docs.npmjs.com/files/package.json#bundleddependencies).

This store spec tries to satisfy the following requirements:

1. the store has to be human-friendly, when possible
2. the store structure should guarantee that two different packages cannot have the same path.
3. it should preserve the original tarball so that the package integrity can be re-evaluated
4. the store structure should enable indefinite caching
5. the store structure should be sufficient to act as a storage backend of a registry

Pitfalls to watch out for:
- Mutable version tags (ie git, 'latest')
- Unpublished packages (ie leftpad disaster)
- Unreliable / invalid package.json files (ie 'follow-redirects@0.0.3' nee [issue](https://github.com/apocas/docker-modem/pull/68))

## Store location

### Global store

A global store should be located at `~/.store/<version>` by default.

### Dedicated store

A dedicated store should be at `node_modules/.store`. The reason why it doesn't need a subfolder for different versions is because one node_modules can use only one store (see [the storePath field of .modules.yaml](#storepath)).

## Store directory structure

Path structure: `<package source>/<package id>`. The path to a package in the store is the package's ID.

### Packages from npm-compatible registries

`<registry URL>/<package name>/<package version>`

E.g.:

```
registry.npmjs.org/gulp/2.1.0
registry.npmjs.org/@cycle/dom/14.1.0
registry.node-modules.io/@wmhilton/log/1.1.0
```

### Packages from Git

`<Git URL domain>/<Git path>/<commit hash>`

E.g.: `github.com/alexGugel/ied/b246270b53e43f1dc469df0c9b9ce19bb881e932`

Module installers should resolve git package references based on branch names or tag names to
commit hashes prior to loading or retrieving from the store.

When updating dependencies, module installers should check whether there are new commits in the branch or
whether the git-tag points to a different commit.

### Tarballs

`<domain>/<path to tarball>`

E.g.: `registry.npmjs.org/is-array/-/is-array-1.0.1`

### Local dependencies

Local dependencies are symlinked in a Windows/MacOS/Linux compatible way, not copy-pasted as with npm.

## `store.yaml`

A file in the root of store that contains information about projects relying on specific packages from the store.
The `store.yaml` is a [YAML](http://yaml.org/) file with sorted keys.

```yaml
/home/john_smith/src/ied:
  - registry.npmjs.org/npm/3.10.2
/home/john_smith/src/ied:
  - registry.npmjs.org/arr-flatten/1.0.1
  - registry.npmjs.org/byline/5.0.0
  - registry.npmjs.org/cache-manager/2.2.0
```

## `.modules.yaml`

A file in the root of node_modules with meta information.
The `.modules.yaml` is a [YAML](http://yaml.org/) file with sorted keys.

### `storePath`

The absolute path to the store which is used for installing dependencies in the current node_modules.

### `packageManager`

Has the name of the package manager that was used for installing the dependencies.

E.g.:

```yaml
packageManager: ied@2.3.6
```

or

```yaml
packageManager: pnpm@1.0.0
```
