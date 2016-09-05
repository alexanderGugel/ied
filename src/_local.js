// import {inherits} from 'util'
// thrown when the currently installed version does not satisfy the semantic
// version constraint.
// inherits(LocalConflictError, Error)
// function LocalConflictError (name, version, expected) {
//  Error.captureStackTrace(this, this.constructor)
//  this.name = 'LocalConflictError'
//  this.message = `Local version ${name}@${version} does not match required\
// version @${expected}`
//  this.extra = {name, version, expected}
// }

// import {_do} from 'rxjs/operator/do'
// import {satisfies} from 'semver'
// const checkConflict = (name, version) => ({pkgJson}) => {
//  if (!satisfies(pkgJson.version, version)) {
//    throw new LocalConflictError(name, pkgJson.version, version)
//  }
// }
// ::_do(isExplicit ? checkConflict(name, version) : Function.prototype)

// ::_do(({pkgJson}) => console.log(`${pkgJson.name}@${pkgJson.version}`))
