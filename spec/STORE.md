> draft, store spec version 1

A store is a folder that contains installed packages and information about relationships between them.

These store spec tries to satisfy the following requirements:

1. the store has to be human-friendly, when possible
2. the store structure should guarantee that two different packages cannot have the same path.
3. the destination path of a package should be known after the resolve step (before fetch).
4. it should preserve the original tarball so that the package integrity can be re-evaluated
5. the store structure should enable indefinite caching
6. the store structure should be sufficient to act as a storage backend of a registry

Pitfalls to watch out for:
- Mutable version tags (ie git, 'latest')
- Unpublished packages (ie leftpad disaster)
- Unreliable / invalid package.json files (ie 'follow-redirects@0.0.3' nee [issue](https://github.com/apocas/docker-modem/pull/68))

## Store location

### Global store

A global store should be located at `~/.store/<version>` by default.

### Dedicated store

A dedicated store should be at `node_modules/.store`. The reason why it doesn't need a subfolder for different versions is because one node_modules can use only one store (see [the storePath field of .modules.yaml](#storePath)).

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

### Packages from git

`<git URL domain>/<git path>/<commit hash>`
or
`<git URL domain>/<git path>/<annotated tag>`
> zkochan: Is it OK to use git tags? Git tags are mutable. Someone can tag a different commit

E.g.: `github.com/alexGugel/ied/b246270b53e43f1dc469df0c9b9ce19bb881e932`

Commits and annotated tags corresponding to a semantic version are both usable.

Lightweight git tags and branches are not, because they are more likely to change.
Module installers should resolve git package references based on branch names or non-version tag names to
commit hashes prior to loading or retrieving from the store.

### Tarballs

`<domain>/<path to tarball>`

E.g.: `registry.npmjs.org/is-array/-/is-array-1.0.1`

### Local dependencies

Local dependencies are symlinked in a Windows/MacOS/Linux compatible way, not copy-pasted as with npm.

## `store.yaml`

A file that contains the store graph. All keys should be sorted.

> Question: What parts of this file are redundant to the information that could be derived by walking the symlink tree? If the store.yaml and filesystem contain conflicting information, how do we resolve the corruption?

> zkochan: the `dependents` part. I'd say the store.yaml is the single place of truth and if in the filesystem something does not match, we can force-update it.

### `storeSpecVersion`

A string adhering to semantic versioning that specifies with which store spec is the store compatible.

### `packages[packageId].dependents`

A dictionary that shows what packages are dependent on each of the package from the store. The dependent packages can be other packages from the store, or packages that use the store to install their dependencies.

For example, `pnpm` has a dependency on `npm` and `semver`. But `semver` is also a dependency of `npm`. It means that after installation, the `store.yaml` would have connections like this in the `dependents` property:

```yaml
packages:
  registry.npmjs.org/semver/5.3.0:
    dependents:
      - /home/john_smith/src/pnpm
      - registry.npmjs.org/npm/3.10.2
  registry.npmjs.org/npm@3.10.2:
    dependents:
      - /home/john_smith/src/pnpm
```

### `packages[packageId].dependencies`

A dictionary that is the opposite of `dependents`. However, it contains not just a list of dependency names but a map of the dependencies to their exact resolved ID.

```yaml
packages:
  /home/john_smith/src/pnpm:
    dependencies:
      npm: registry.npmjs.org/npm/3.10.2
      semver: registry.npmjs.org/semver/5.3.0
  registry.npmjs.org/npm@3.10.2:
    dependencies:
      semver: registry.npmjs.org/semver/5.3.0
```

## `.modules.yaml`

In order to disallow the usage of different stores from the same node_modules, the `.modules.yaml` file contains information about the origin of packages. This file is required only in node_modules that are outside of the store and has to be in the root of the node_modules folder.

> Can you explain what you mean? I don't get it

> zkochan: Lets say you have two stores: X and Y. And you have a package - A. You installed the dependencies of A using the X store. Now you don't want to install other dependencies using store Y. You want all the dependencies in A's node_modules to be from the same store.

### `storePath`

Has the absolute path to the store that is used for installing the dependencies.

### `packageManager`

Has the name of the package manager that was used for installing the dependencies.

> you mean like 'ied' or 'pnpm'?

> zkochan: yes, maybe even the version of it, like ied@1.0.1
