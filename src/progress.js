import ora from 'ora'

const options = {
	spinner: 'clock'
}

const spinner = ora(options)

let completed = 0
let added = 0
let status = ''

// start the spinner on startup
spinner.start()

/**
 * Logs the progress by updating the status message, percentage and spinner.
 * @param  {string} [_status] - optional (updated) status message. defaults to
 * the previous status message.
 * @see https://www.npmjs.org/package/ora
 */
export const report = (_status = status) => {
	status = _status
	const progress = Math.round((completed / added) * 100 * 100) / 100
	spinner.text = `${progress}% ${status}`
}

/**
 * Adds one or more scheduled tasks.
 * @param {Number} [n=1] - number of scheduled tasks.
 */
export const add = (n = 1) => {
	added += n
	report()
}

/**
 * Completes a previously scheduled task. Stops the spinner when there are no
 * outstanding tasks.
 * @param  {Number} [n=1] - number of tasks that have been completed.
 */
export const complete = (n = 1) => {
	completed += n
	if (added === completed) spinner.stop()
	else report()
}
