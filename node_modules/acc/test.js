var test = require('tape')
var acc = require('./')

test('basic', function (t) {
  t.plan(2)

  var fn = acc(2, function () {
    t.pass('should invoke callback after 2 calls')
    t.deepEqual(Array.prototype.slice.call(arguments), [
      [1, 2],
      [2, 3],
      [3, 4]
    ], 'should invoke callback with accumulated result')
  })
  fn(1, 2, 3)
  fn(2, 3, 4)
})

test('inconsistent arguments', function (t) {
  t.plan(5)

  var fn = acc(2, function () {
    var args = Array.prototype.slice.call(arguments)
    t.deepEqual(args[0], [1, 2])

    // tape's deep-equal dependency doesn't handle sparse arrays correctly.
    // See https://github.com/substack/node-deep-equal/issues/2
    t.deepEqual(args[1][0], undefined)
    t.deepEqual(args[1][1], 3)
    t.deepEqual(args[2][0], undefined)
    t.deepEqual(args[2][1], 4)
  })
  fn(1)
  fn(2, 3, 4)
})

test('called to ofen', function (t) {
  t.plan(2)

  var fn = acc(2, function () {
    t.pass('should invoke callback after 2 calls')
  })
  fn()
  fn()
  t.throws(function () {
    fn()
  }, 'should throw an error after more than 2 calls')
})

test('invalid args', function (t) {
  var invalidArgs = [
    [null, null],
    [null, function () {}],
    [1.5, function () {}],
    [-1, function () {}],
    [-1.5, function () {}],
    [3, '']
  ]
  invalidArgs.forEach(function (args) {
    t.throws(function () {
      acc(args[0], args[1])
    }, 'should throw for acc(' + args[0] + ', ' + args[1] + ')')
  })

  t.end()
})
