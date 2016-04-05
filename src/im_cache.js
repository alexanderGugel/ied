/**
 * internal in-memory cache primarily used for HTTP responses.
 * @type {Object}
 */
let cache = Object.create(null)

/**
 * cache a key-value item.
 * @param {String} k - unique key of the item.
 * @param {*} v - value of the item.
 * @return {*} v - value of the item.
 */
export function set (k, v) {
  cache[k] = v
  return v
}

/**
 * retrieve an item from the cache.
 * @param  {String} k - unique key of the value to be retrieved.
 * @return {*} - value of the item.
 */
export function get (k) {
  return cache[k]
}

/**
 * manually evict an item from the cache.
 * @param  {String} k - key of the item to be evicted.
 */
export function clear (k) {
  delete cache[k]
}

/**
 * reset the cache, clearing all items from it.
 */
export function reset () {
  cache = Object.create(null)
}
