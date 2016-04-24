import ora from 'ora'

const spinner = ora()

let completed = 0
let added = 0
let status = ''

spinner.start()

export function add (n = 1) {
	added += n
	report()
}

export function complete (n = 1) {
	completed += n
	if (added === completed) spinner.stop()
	else report()
}

export function report (_status = status) {
	status = _status
	const progress = Math.round((completed / added) * 100 * 100) / 100
	spinner.text = `${progress}% ${status}`
}
