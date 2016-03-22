import url from 'url'
import {registry} from './config'
import {httpGetJSON} from './util'

function ping () {
  const uri = url.resolve(registry, '-/ping?write=true')
  return httpGetJSON(uri)
}

export default function run () {
  return ping().subscribe(
    (json) => console.log(json),
    (err) => { throw err }
  )
}
