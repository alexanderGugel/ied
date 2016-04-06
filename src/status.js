import {setTitle} from './util'

let started = 0
let completed = 0
let status = ''

/**
 * complete a task.
 * @param  {Number} n - number of tasks that have been completed.
 */
export function complete (n = 1) {
  completed += n
  draw()
}

/**
 * start a task.
 * @param  {Number} n - number of tasks that have been started.
 */
export function start (n = 1) {
  started += n
  draw()
}

/**
 * update the status of the current execution context.
 * @param  {String} status - human-readable status update.
 */
export function update (_status = '') {
  status = _status
  draw()
}

/**
 * set the status as title in the terminal and update the progress bar.
 */
export function draw () {
  if (!process.stderr.isTTY) return

  const ratio = started ? completed / started : 0
  const percentage = Math.ceil(ratio * 10000) / 100

  const title = `${percentage.toFixed(2)}% - ${status}`
  setTitle(title)

  process.stderr.cursorTo(0)

  const maxWidth = Math.min(process.stderr.columns - 8, 50)
  const barWidth = Math.floor(maxWidth * ratio)

  let bar = ''

  if (maxWidth > 0) {
    for (let i = 0; i < maxWidth; i++) {
      bar += i <= barWidth ? '▓' : '░'
    }
    bar += ' '
  }

  process.stderr.write(bar + percentage.toFixed(2) + '%')
  process.stderr.clearLine(1)
}

/**
 * clear the progress bar.
 */
export function clear () {
  if (!process.stderr.isTTY) return

  process.stderr.clearLine()
  process.stderr.cursorTo(0)
}
