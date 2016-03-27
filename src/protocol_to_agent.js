import http from 'http'
import https from 'https'
import config from './config'
import HttpProxyAgent from 'https-proxy-agent'

const httpProxy = config.httpProxy && HttpProxyAgent(config.httpProxy)
const httpsProxy = config.httpsProxy && HttpProxyAgent(config.httpsProxy)

export default {
  'http:': httpProxy || http.globalAgent,
  'https:': httpsProxy || https.globalAgent
}
