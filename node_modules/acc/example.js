var acc = require('./')

var fn = acc(2, function (a, b, c) {
  // This function is being invoked after two calls of fn()
  // arguments #=> [[1, 2], [2, 3], [3, 4]]
  console.log('1, 2: ', a[0], a[1])
  console.log('2, 3: ', b[0], b[1])
  console.log('3, 4: ', c[0], c[1])
})

fn(1, 2, 3)
fn(2, 3, 4)
