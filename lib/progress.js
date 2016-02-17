'use strict'

var isTTY = process.stderr.isTTY

var completed = 0
var started = 0
var columns = 30

// A basic progress bar. Nothing fancy. This should probably be an external
// dependency.

exports.complete = complete
function complete (n) {
  completed += n
  draw()
  if (started === completed) {
    clear()
  }
}

exports.start = start
function start (n) {
  started += n
  draw()
}

exports.draw = draw
function draw () {
  // Don't show progress bar when logger is enabled
  if (process.env.NODE_DEBUG || !isTTY) return
  var ratio = started ? completed / started : 0
  var percentage = Math.ceil(ratio * 10000) / 100
  process.stderr.cursorTo(0)
  var barWidth = Math.floor(columns * ratio)
  var bar = '['
  for (var i = 0; i < columns; i++) {
    bar += i <= barWidth ? '=' : ' '
  }
  bar += '] '
  process.stderr.write(bar + percentage.toFixed(2) + '%')
  process.stderr.clearLine(1)
}

exports.clear = clear
function clear () {
  if (!isTTY) return
  process.stderr.clearLine()
  process.stderr.cursorTo(0)
}
