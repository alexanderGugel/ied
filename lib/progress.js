'use strict'

var completed = 0
var started = 0

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
}

exports.clear = clear
function clear () {
}
