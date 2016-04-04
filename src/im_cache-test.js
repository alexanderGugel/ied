/* global describe it afterEach */

import assert from 'assert'
import * as imCache from './im_cache'

afterEach(() => {
  imCache.reset()
})

describe('imCache.set / imCache.get', () => {
  it('should cache an item', () => {
    imCache.set('k', 'v')
    assert.equal(imCache.get('k'), 'v')
  })

  it('should override a previously set item with the same key', () => {
    imCache.set('k', 'v')
    imCache.set('k', 'v2')
    assert.equal(imCache.get('k'), 'v2')
  })
})

describe('imCache.reset', () => {
  it('should clear all items from the cache', () => {
    imCache.set('k0', 'v0')
    imCache.set('k1', 'v1')
    imCache.reset()
    assert.equal(imCache.get('k0'), undefined)
    assert.equal(imCache.get('k1'), undefined)
  })
})

describe('imCache.clear', () => {
  it('should evict an item from the cache', () => {
    imCache.set('k0', 'v0')
    imCache.set('k1', 'v1')
    imCache.clear('k0')
    assert.equal(imCache.get('k0'), undefined)
    assert.equal(imCache.get('k1'), 'v1')
  })
})
