import http from 'http'
import https from 'https'
import config from './config'
import HttpProxyAgent from 'https-proxy-agent'
import debuglog from './debuglog'

const debug = debuglog('protocol_to_agent')

const httpProxy = config.httpProxy && HttpProxyAgent(config.httpProxy)
if (httpProxy) debug('using HTTP proxy server %s', config.httpProxy)

const httpsProxy = config.httpsProxy && HttpProxyAgent(config.httpsProxy)
if (httpsProxy) debug('using HTTPS proxy server %s', config.httpsProxy)

const protocolToAgent = {
  'http:': httpProxy || http.globalAgent,
  'https:': httpsProxy || https.globalAgent
}

module.exports = protocolToAgent
