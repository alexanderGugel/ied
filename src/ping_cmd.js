import {ping} from './ping'

export default function pingCmd () {
  return ping().subscribe(console.log)
}
