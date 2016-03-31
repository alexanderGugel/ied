/**
 * class representing a "local" version of a possibly installed package (e.g.
 * during the installation procedure).
 */
export class Dep {
  /**
   * create instance.
   * @param  {Object} [options.pkgJSON] - an object
   * representing a `package.json` file.
   * @param  {String} [options.target] - where the package has **actually**
   * been installed into.
   * @param  {String} [options.path] - path of the symlink pointing to the
   * (possibly relative) `target`.
   */
  constructor ({pkgJSON, target, path }) {
    this.pkgJSON = pkgJSON
    this.target = target
    this.path = path
  }
}
