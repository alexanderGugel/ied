export class CorruptedPackageError extends Error {
  /**
   * create instance.
   * @param  {String} tarball  - tarball url from which the corresponding
   * tarball has been downloaded.
   * @param  {String} expected - expected shasum.
   * @param  {String} actual   - actual shasum.
   */
  constructor (tarball, expected, actual) {
    super(`shasum mismatch while downloading ${tarball}: ${actual} <-> ${expected}`)
    this.name = 'CorruptedPackageError'
    this.tarball = tarball
    this.expected = expected
    this.actual = actual
  }

  /**
   * name of the error.
   * @name CorruptedPackageError#name
   * @type String
   * @default "CorruptedPackageError"
   * @readonly
   */

  /**
   * tarball url from which the corresponding tarball has been downloaded.
   * @name CorruptedPackageError#tarball
   * @type String
   * @readonly
   */

  /**
   * expected shasum.
   * @name CorruptedPackageError#expected
   * @type String
   * @readonly
   */

  /**
   * actual shasum.
   * @name CorruptedPackageError#actual
   * @type String
   * @readonly
   */
}

/**
 * error class for the case when the required version target is not available
 * (= the package is in the registry, but the available version is not
 * available).
 * @extends Error
 */
export class VersionError extends Error {
  /**
   * create instance.
   * @param {String} name - name of the package.
   * @param {String} version - unavailable version number.
   * @param {Array.<String>} - array of available version numbers.
   * @param {Array.<String>} options.available - an array of available versions
   */
  constructor (name, version, available) {
    super(`no satisying version of ${name} in ${available.join(', ')} for ${version}`)
    this.name = 'VersionError'
    this.pkgName = name
    this.version = version
    this.available = available
  }

  /**
   * name of the error (not the package name).
   *
   * @name VersionError#name
   * @type String
   * @default "VersionError"
   * @readonly
   */

  /**
   * package name.
   *
   * @name VersionError#pkgName
   * @type String
   * @readonly
   */

  /**
   * target version that could not be found.
   *
   * @name VersionError#version
   * @type String
   * @readonly
   */

  /**
   * all available version numbers of the supplied package.
   *
   * @name available
   * @type Array.<String>
   * @readonly
   */
}

/**
 * error class for the case when the package root is not "valid", meaning the
 * document that we got from the registry does not represent a valid package
 * root document.
 */
export class PackageRootError extends Error {
  /**
   * create instance.
   * @param  {String} url - url of the package root.
   * @param  {Object} body - body of the invalid package root.
   */
  constructor (url, body) {
    if (body && body.error) {
      super(`invalid package root at ${url}: ${body.error}`)
    } else {
      super(`invalid package root at ${url}`)
    }
    this.name = 'PackageRootError'
    this.url = url
    this.body = body
  }

  /**
   * name of the error.
   *
   * @name PackageRootError#name
   * @type String
   * @default "PackageRootError"
   * @readonly
   */

  /**
   * url of the package root.
   * @name PackageRootError#url
   * @type String
   * @readonly
   */

  /**
   * body of the invalid package root.
   * @name PackageRootError#body
   * @type Object
   * @readonly
   */
}
