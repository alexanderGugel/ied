import * as config from './config'
import Table from 'easy-table'

/**
 * print the used configuration object as an ASCII table.
 */
export default function configCmd () {
	const table = new Table()

  const keys = Object.keys(config)
  for (let key of keys) {
		const value = config[key]
		table.cell('key', key)
		table.cell('value', value)
		table.newRow()
	}

	console.log(table.toString())
}
