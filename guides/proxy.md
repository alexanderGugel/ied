## Using `ied` behind a proxy

`ied` can easily be configured to run behind a (corporate) proxy server.
Both HTTP and HTTPS proxies are supported. Optionally a username and password
can be supplied as part of the URL.

`ied` does not use a system-wide configuration file, but instead uses
environment variables.

In order force `ied` to use a corporate proxy, set the `IED_PROXY` environment
variable to the URL of your proxy server. Alternatively you can set
`http_proxy`, which might already be set depending on your system:

```bash
export IED_PROXY=http://user:pass@proxy.server.com:3128
```

Since corporate proxies tend to throttle connections, concurrent installations
might be less reliable. Thankfully `ied` is quite resistant in those scenarios,
but if needed you can still set the `IED_REQUEST_RETRIES` environment variable,
which instructs `ied` to retry failed (= timed out) requests.
`IED_REQUEST_RETRIES` defaults to 10 requests:

```bash
# defaults to 10
export IED_REQUEST_RETRIES=13
```

For in-line documentation, see [`config.js`](../src/config.js).
