/**
 * class used for creating `package.json` files with neutral behavior
 * (e.g. in case of an `ENOENT`).
 */
export class NullPkgJSON {
  /**
   * create instance.
   * @param  {Object} [options.dependencies = {}] - dependencies.
   * @param  {Object} [devDependencies = {}] - development dependencies.
   */
  constructor ({dependencies = {}, devDependencies = {}} = {}) {
    this.dependencies = dependencies
    this.devDependencies = devDependencies
  }
}
