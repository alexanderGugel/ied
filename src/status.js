import {setTerminalTitle} from './util'

class Status {
  constructor () {
    this.started = 0
    this.completed = 0
    this.status = ''
  }

  complete (n = 1) {
    this.completed += n
    this.draw()
    return this
  }

  start (n = 1) {
    this.started += n
    this.draw()
    return this
  }

  update (status) {
    this.status = status
    this.draw()
    return this
  }

  draw () {
    if (!process.stderr.isTTY) return

    const ratio = this.started ? this.completed / this.started : 0
    const percentage = Math.ceil(ratio * 10000) / 100

    const title = `${percentage.toFixed(2)}% - ${this.status}`
    setTerminalTitle(title)

    process.stderr.cursorTo(0)
    let barWidth = Math.floor(Status.WIDTH * ratio)
    let bar = '['
    for (let i = 0; i < Status.WIDTH; i++) {
      bar += i <= barWidth ? '#' : ' '
    }
    bar += '] '
    process.stderr.write(bar + percentage.toFixed(2) + '%')
    process.stderr.clearLine(1)
  }

  clear () {
    if (!process.stderr.isTTY) return
    process.stderr.clearLine()
    process.stderr.cursorTo(0)
  }
}

Status.WIDTH = 50

export default new Status()
