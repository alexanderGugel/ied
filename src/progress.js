import ora from 'ora'

const spinner = ora({
	spinner: 'clock'
})

let completed = 0
let added = 0
let status = ''

// start the spinner on startup
// spinner.start()

/**
 * add one or more scheduled tasks.
 * @param {Number} [n=1] - number of scheduled tasks.
 */
export function add (n = 1) {
	added += n
	report()
}

/**
 * complete a previously scheduled task. stop the spinner when there are no
 * outstanding tasks.
 * @param  {Number} [n=1] - number of tasks that have been completed.
 */
export function complete (n = 1) {
	completed += n
	if (added === completed) spinner.stop()
	else report()
}

/**
 * log the progress by updating the status message, percentage and spinner.
 * @param  {String} [_status] - optional (updated) status message. defaults to
 * the previous status message.
 * @see https://www.npmjs.org/package/ora
 */
export function report (_status = status) {
	status = _status
	const progress = Math.round((completed / added) * 100 * 100) / 100
	spinner.text = `${progress}% ${status}`
}
