import Table from 'easy-table'

/**
 * Prints the used configuration object as an ASCII table.
 * @param  {Object} config - Config object.
 */
export default config => {
	const table = new Table()
	const keys = Object.keys(config)

	for (let i = 0; i < keys.length; i++) {
		const key = keys[i]
		const value = config[key]
		table.cell('key', key)
		table.cell('value', value)
		table.newRow()
	}

	console.log(table.toString())
}
