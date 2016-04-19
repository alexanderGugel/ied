/**
 * merge dependency fields.
 * @param  {Object} pkgJson - `package.json` object from which the dependencies
 * should be obtained.
 * @param  {Array.<String>} fields - property names of dependencies to be merged
 * together.
 * @return {Object} - merged dependencies.
 */
function mergeDependencies (pkgJson, fields) {
  const allDependencies = {}
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i]
    const dependencies = pkgJson[field] || {}
    const names = Object.keys(dependencies)
    for (let j = 0; j < names.length; j++) {
      const name = names[j]
      allDependencies[name] = dependencies[name]
    }
  }
  return allDependencies
}

/**
 * extract an array of bundled dependency names from the passed in
 * `package.json`. uses the `bundleDependencies` and `bundledDependencies`
 * properties.
 * @param  {Object} pkgJson - plain JavaScript object representing a
 * `package.json` file.
 * @return {Array.<String>} - array of bundled dependency names.
 */
function parseBundleDependencies (pkgJson) {
  const bundleDependencies = (pkgJson.bundleDependencies || [])
    .concat(pkgJson.bundledDependencies || [])
  return bundleDependencies
}

/**
 * extract specified dependencies from a specific `package.json`.
 * @param  {Object} pkgJson - plain JavaScript object representing a
 * `package.json` file.
 * @param  {Array.<String>} fields - array of dependency fields to be followed.
 * @return {Array} - array of dependency pairs.
 */
export function parseDependencies (pkgJson, fields) {
  // bundleDependencies and bundledDependencies are optional. we need to
  // exclude those form the final [name, version] pairs that we're generating.
  const bundleDependencies = parseBundleDependencies(pkgJson)
  const allDependencies = mergeDependencies(pkgJson, fields)
  const names = Object.keys(allDependencies)
  const results = []
  for (let i = 0; i < names.length; i++) {
    const name = names[i]
    if (bundleDependencies.indexOf(name) === -1) {
      results.push([name, allDependencies[name]])
    }
  }
  return results
}

/**
 * normalize the `bin` property in `package.json`, which could either be a
 * string, object or undefined.
 * @param  {Object} pkgJson - plain JavaScript object representing a
 * `package.json` file.
 * @return {Object} - normalized `bin` property.
 */
export function normalizeBin (pkgJson) {
  return typeof pkgJson.bin === 'string'
    ? ({ [pkgJson.name]: pkgJson.bin })
    : (pkgJson.bin || {})
}
