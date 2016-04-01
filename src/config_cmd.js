import * as config from './config'
import Table from 'easy-table'

export default function configCmd () {
  const table = new Table()

  for (let key in config) {
    const value = config[key]
    table.cell('key', key)
    table.cell('value', value)
    table.newRow()
  }

  console.log(table.toString())
}
