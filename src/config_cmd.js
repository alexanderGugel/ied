import * as config from './config'
import Table from 'easy-table'

export default function configCmd () {
  const table = new Table()

  Object.keys(config).forEach(function (key) {
    const value = config[key]
    table.cell('key', key)
    table.cell('value', value)
    table.newRow()
  })

  console.log(table.toString())
}
