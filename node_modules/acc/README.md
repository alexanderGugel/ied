# acc

[![Build Status](https://travis-ci.org/alexanderGugel/acc.svg?branch=master)](https://travis-ci.org/alexanderGugel/acc)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://github.com/feross/standard)
[![unstable](http://badges.github.io/stability-badges/dist/unstable.svg)](http://github.com/badges/stability-badges)

A more generic version of [`after`](https://github.com/Raynos/after) function that accumulates arguments (including errors) from previous invocations.

## Usage

```js
  var acc = require('acc')

  var fn = acc(2, function (a, b, c) {
    // This function is being invoked after two calls of fn()
    // arguments #=> [[1, 2], [2, 3], [3, 4]]
    console.log('1, 2: ', a[0], a[1])
    console.log('2, 3: ', b[0], b[1])
    console.log('3, 4: ', c[0], c[1])
  })

  fn(1, 2, 3)
  fn(2, 3, 4)
```

## Install

Via [npm](https://www.npmjs.org/):

```
npm i acc
```

## License

See [`LICENSE` file](LICENSE).
