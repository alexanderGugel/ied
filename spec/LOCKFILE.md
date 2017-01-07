# Lockfile

In order to get consistent installs across machines, package managers need more information than the dependencies configured in `package.json`. Package managers need to store exactly which versions of each dependency were installed.

For storing this information, the `dependencies-lock.yaml` file is used in the root of the project. A simple lockfile looks like this:

```yaml
registry: https://registry.npmjs.org
resolutions:
  ied:
    alexanderGugel/ied#2.3.4:
      commit: 373c7fa787e486438a998b4b4574ac5684d42e5f
      checksum: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
  package-1:
    ^1.0.0, ~1.0.0:
      version: 1.0.3
      checksum: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
  package-2:
    ^2.0.0:
      version: 2.0.1
      checksum: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
  package-3:
    ^3.0.0:
      version: 3.1.9
      checksum: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
  package-4:
    ^4.0.0, ^4.5.0:
      version: 4.5.1
      checksum: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
```

## `dependencies-lock.yaml` structure

The lockfile is a [YAML](http://yaml.org/) file with sorted keys.

* `resolutions` - the resolutions property maps fuzzy dependencies to exact ones.
  * `.<package name>` - resolutions of a specific package.
    * `.<fuzzy dependencies>` - the key is a comma-separated list of fuzzy dependencies (e.g., `^1.0.0`, `>=2`, `2|3`) and the value is the resolution.
      * `.checksum` - optional. The checksum of the resolved package.
      * Other properties are different for different source types.
* `registry` - contains the registry that was used to resolve the dependencies.

## Current package only

During install package managers only use the top-level dependencies lockfile and ignore any lockfiles that exist within dependencies. The top-level `dependencies-lock.yaml` file includes everything package managers need to lock the versions of all packages in the entire dependency tree.

## Check into source control 

All `dependencies-lock.yaml` files should be checked into source control (e.g. git or mercurial). This allows package managers to install the same exact dependency tree across all machines.

Framework and library authors should also check `dependencies-lock.yaml` into source control. Even when published, `dependencies-lock.yaml` file won’t have any effect on users of the library.
