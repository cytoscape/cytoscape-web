import { describe, expect, it } from 'vitest'

import { CyWebApi } from './index'
import { buildPerAppApis } from './perAppApis'

describe('buildPerAppApis', () => {
  it('carries every domain from the anonymous CyWebApi surface', () => {
    // The failure this guards: a new domain added to CyWebApi but not reachable
    // from an app, which used to be possible because three call sites each
    // assembled this object by hand.
    const apis = buildPerAppApis('app-a')

    for (const key of Object.keys(CyWebApi)) {
      expect(apis, `missing domain: ${key}`).toHaveProperty(key)
    }
  })

  it('adds resource, which window.CyWebApi deliberately lacks', () => {
    const apis = buildPerAppApis('app-a')

    expect(apis.resource).toBeDefined()
    expect(CyWebApi).not.toHaveProperty('resource')
  })

  it('overrides contextMenu with a per-app instance', () => {
    const apis = buildPerAppApis('app-a')

    expect(apis.contextMenu).toBeDefined()
    expect(apis.contextMenu).not.toBe(CyWebApi.contextMenu)
  })

  it('returns independent instances for different apps', () => {
    const a = buildPerAppApis('app-a')
    const b = buildPerAppApis('app-b')

    expect(a.resource).not.toBe(b.resource)
    expect(a.contextMenu).not.toBe(b.contextMenu)
    expect(a.nodeGraphics).not.toBe(b.nodeGraphics)
  })

  it('registers context menu items under the calling app', () => {
    const apis = buildPerAppApis('app-a')

    const result = apis.contextMenu.addContextMenuItem({
      label: 'Do a thing',
      handler: () => {},
    })
    expect(result.success).toBe(true)

    // A different app must not be able to remove it.
    const other = buildPerAppApis('app-b')
    const itemId = result.success ? result.data.itemId : ''
    expect(other.contextMenu.removeContextMenuItem(itemId).success).toBe(false)

    // The owner can.
    expect(apis.contextMenu.removeContextMenuItem(itemId).success).toBe(true)
  })
})
