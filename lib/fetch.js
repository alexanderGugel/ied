'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = fetch;

var _http = require('http');

var _http2 = _interopRequireDefault(_http);

var _gunzipMaybe = require('gunzip-maybe');

var _gunzipMaybe2 = _interopRequireDefault(_gunzipMaybe);

var _tarFs = require('tar-fs');

var _tarFs2 = _interopRequireDefault(_tarFs);

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

var _cache = require('./cache');

var cache = _interopRequireWildcard(_cache);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _Observable = require('rxjs/Observable');

var _ErrorObservable = require('rxjs/observable/ErrorObservable');

var _EmptyObservable = require('rxjs/observable/EmptyObservable');

var _catch2 = require('rxjs/operator/catch');

var _protocol_to_agent = require('./protocol_to_agent');

var _protocol_to_agent2 = _interopRequireDefault(_protocol_to_agent);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = require('./debuglog')('fetch');

function fetchFromRegistry(dest, tarball, shasum) {
  return _Observable.Observable.create(function (observer) {
    var errHandler = function errHandler(err) {
      return observer.error(err);
    };

    // We need to map the filenames, otherwise we would get paths like
    // [shasum]/package, but we want [shasum] to be have whatever files
    // [package] contains
    var untar = _tarFs2.default.extract(dest);

    // We verify the actual shasum to detect "corrupted" packages.
    var actualShasum = _crypto2.default.createHash('sha1');

    var opts = _url2.default.parse(tarball);
    opts.agent = _protocol_to_agent2.default[opts.protocol];
    if (!opts.agent) {
      return observer.error(new Error(tarball + ' uses an unsupported protocol'));
    }

    _http2.default.get(opts, function (res) {
      if (res.statusCode !== 200) {
        return observer.error(new Error('Unexpected status code ' + res.statusCode + ' for ' + tarball));
      }

      // Write to cache.
      var cached = res.pipe(cache.write()).on('error', errHandler);

      function onFinish() {
        var expectedShasum = actualShasum.digest('hex');
        if (expectedShasum !== shasum) {
          observer.error(new Error('Downloaded tarball has incorrect shasum'));
        }
        debug('cached %s in %s', shasum, cached.path);

        return _fs2.default.rename(cached.path, _path2.default.join(_config2.default.cacheDir, shasum), function (err) {
          if (err) return errHandler(err);
          observer.complete();
        });
      }

      res.on('data', function (chunk) {
        return actualShasum.update(chunk);
      });

      res.on('error', errHandler).pipe((0, _gunzipMaybe2.default)()).on('error', errHandler).pipe(untar).on('error', errHandler).on('finish', onFinish);
    }).on('error', errHandler);
  });
}

// Fetches the specified tarball. Verifies the passed in shasum if not cached.
function fetch(dest, tarball, shasum) {
  var _context;

  return (_context = cache.fetch(dest, shasum), _catch2._catch).call(_context, function (err) {
    return err.code === 'ENOENT' ? fetchFromRegistry(dest, tarball, shasum) : _ErrorObservable.ErrorObservable.create(err);
  });
}