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
    const ratio = this.started ? this.completed / this.started : 0
    const percentage = Math.ceil(ratio * 10000) / 100
    const title = `${percentage.toFixed(2)}% - ${this.status}`
    setTerminalTitle(title)
  }
}

export default new Status()
