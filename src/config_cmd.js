'use strict'

var config = require('./config')
var Table = require('easy-table')

function configCmd () {
  var table = new Table()

  Object.keys(config).forEach(function (key) {
    var value = config[key]
    table.cell('key', key)
    table.cell('value', value)
    table.newRow()
  })

  console.log(table.toString())
}

module.exports = configCmd
