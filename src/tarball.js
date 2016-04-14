import crypto from 'crypto'

function pkgUid (name, version) {
  const sha = crypto.createHash('sha1')
  sha.update(name + '@' + version)
  return sha.digest('hex')
}

export function resolve (name, version, url) {
  return {
    name: name,
    type: 'tarball',
    version: version,
    dist: {
      shasum: pkgUid(name, version),
      tarball: url
    }
  }
}
