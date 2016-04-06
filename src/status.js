import {setTitle} from './util'

let started = 0
let completed = 0
let status = ''
let active = false

export const HIDE_CURSOR = '\x1B[?25l'
export const SHOW_CURSOR = '\x1B[?25h'

export const STARTED_BLOCK = '░'
export const COMPLETED_BLOCK = '▓'

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

  const maxWidth = Math.min(process.stderr.columns - 8, 50)
  const barWidth = Math.floor(maxWidth * ratio)

  let bar = ''

  if (maxWidth > 0) {
    for (let i = 0; i < maxWidth; i++) {
      bar += i <= barWidth ? COMPLETED_BLOCK : STARTED_BLOCK
    }
    bar += ' '
  }

  process.stderr.write(HIDE_CURSOR)

  if (active) {
    process.stderr.moveCursor(0, -1)
    process.stderr.cursorTo(0)
  }

  process.stderr.write(bar + percentage.toFixed(2) + '%')
  process.stderr.clearLine(1)

  process.stderr.write('\n')
  process.stderr.write(status)
  process.stderr.clearLine(1)

  process.stderr.write(SHOW_CURSOR)

  active = true
}

/**
 * clear the progress bar.
 */
export function clear () {
  if (!process.stderr.isTTY) return
  if (!active) return

  process.stderr.clearLine()
  process.stderr.moveCursor(0, -1)
  process.stderr.clearLine()
  process.stderr.cursorTo(0)

  active = false
}
