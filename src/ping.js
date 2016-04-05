import url from 'url'
import {registry} from './config'
import {httpGetJSON} from './util'

export function ping () {
  const uri = url.resolve(registry, '-/ping?write=true')
  return httpGetJSON(uri)
}
