import {ping} from './ping'

/**
 * ping the registry and print the received response.
 * @return {Subscription} - subscription to the {@link ping} command.
 */
export default function pingCmd () {
	return ping().subscribe(console.log)
}
