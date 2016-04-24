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
 * error class used for representing an error that occurs due to a lifecycle
 * script that exits with a non-zero status code.
 */
export class FailedBuildError extends Error {
	/**
	 * create instance.
	 */
	constructor () {
		super('failed to build one or more dependencies that exited with != 0')
		this.name = FailedBuildError
	}

	/**
	 * name of the error.
	 *
	 * @name FailedBuildError#name
	 * @type String
	 * @default "FailedBuildError"
	 * @readonly
	 */
}
