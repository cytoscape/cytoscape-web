// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'

import {
  clearNdexAccessKeysForTesting,
  getNdexAccessKey,
  rememberNdexAccessKeyFromUrl,
} from './accessKeys'

const NET = '3e906026-ae28-11f1-a428-005056ae3c32'

afterEach(() => {
  clearNdexAccessKeysForTesting()
})

describe('rememberNdexAccessKeyFromUrl', () => {
  it('remembers the key of a network deep link', () => {
    rememberNdexAccessKeyFromUrl(`/0/networks/${NET}`, '?accesskey=key-1')

    expect(getNdexAccessKey(NET)).toBe('key-1')
  })

  it('reads the network id under a base path and with a trailing slash', () => {
    rememberNdexAccessKeyFromUrl(
      `/cytoscape/ws-1/networks/${NET}/`,
      '?selectedNodes=1&accesskey=key-2',
    )

    expect(getNdexAccessKey(NET)).toBe('key-2')
  })

  it('ignores a link without a key', () => {
    rememberNdexAccessKeyFromUrl(`/0/networks/${NET}`, '?selectedNodes=1')
    rememberNdexAccessKeyFromUrl(`/0/networks/${NET}`, '?accesskey=')

    expect(getNdexAccessKey(NET)).toBeUndefined()
  })

  it('ignores a key on a path that names no network', () => {
    rememberNdexAccessKeyFromUrl('/0', '?accesskey=key-3')
    rememberNdexAccessKeyFromUrl('/0/networks/', '?accesskey=key-3')

    expect(getNdexAccessKey('')).toBeUndefined()
    expect(getNdexAccessKey('0')).toBeUndefined()
  })
})
