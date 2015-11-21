var http = require('http')
var https = require('https')
var config = require('./config')
var HttpProxyAgent = require('https-proxy-agent')
var util = require('util')
var debug = util.debuglog('protocol_to_agent')

if (config.httpProxy) {
  var httpProxy = HttpProxyAgent(config.httpProxy)
  debug('using HTTP proxy server %s', config.httpProxy)
}

if (config.httpsProxy) {
  var httpsProxy = HttpProxyAgent(config.httpsProxy)
  debug('using HTTPS proxy server %s', config.httpsProxy)
}

var protocolToAgent = {
  'http:': httpProxy || http.globalAgent,
  'https:': httpsProxy || https.globalAgent
}

module.exports = protocolToAgent
