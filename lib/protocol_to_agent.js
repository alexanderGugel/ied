'use strict';

var _http = require('http');

var _http2 = _interopRequireDefault(_http);

var _https = require('https');

var _https2 = _interopRequireDefault(_https);

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

var _httpsProxyAgent = require('https-proxy-agent');

var _httpsProxyAgent2 = _interopRequireDefault(_httpsProxyAgent);

var _debuglog = require('./debuglog');

var _debuglog2 = _interopRequireDefault(_debuglog);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = (0, _debuglog2.default)('protocol_to_agent');

var httpProxy = _config2.default.httpProxy && (0, _httpsProxyAgent2.default)(_config2.default.httpProxy);
if (httpProxy) debug('using HTTP proxy server %s', _config2.default.httpProxy);

var httpsProxy = _config2.default.httpsProxy && (0, _httpsProxyAgent2.default)(_config2.default.httpsProxy);
if (httpsProxy) debug('using HTTPS proxy server %s', _config2.default.httpsProxy);

var protocolToAgent = {
  'http:': httpProxy || _http2.default.globalAgent,
  'https:': httpsProxy || _https2.default.globalAgent
};

module.exports = protocolToAgent;