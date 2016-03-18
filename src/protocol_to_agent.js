import http from 'http'
import https from 'https'
import * as config from './config'
import HttpProxyAgent from 'https-proxy-agent'

const httpProxy = config.httpProxy && HttpProxyAgent(config.httpProxy)
const httpsProxy = config.httpsProxy && HttpProxyAgent(config.httpsProxy)

const protocolToAgent = {
  'http:': httpProxy || http.globalAgent,
  'https:': httpsProxy || https.globalAgent
}

module.exports = protocolToAgent
