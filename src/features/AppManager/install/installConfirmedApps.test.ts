import { describe, expect, it, vi } from 'vitest'

import { AppType } from '@/models/AppModel/AppType'
import type { PendingAppInstall } from '@/models/AppModel/PendingAppInstall'
import { installConfirmedApps } from './installConfirmedApps'

const reactApp = (id: string): PendingAppInstall => ({
  type: AppType.Client,
  url: `https://apps.example.com/${id}/manifest.json`,
  entry: {
    id,
    name: `App ${id}`,
    url: `https://apps.example.com/${id}/remoteEntry.js`,
    author: 'Someone',
  },
})

const serviceApp = (name: string): PendingAppInstall => ({
  type: AppType.Service,
  url: `https://svc.example.com/${name}`,
  metadata: { name } as never,
})

const makeDeps = () => ({
  installApp: vi.fn().mockResolvedValue(undefined),
  addService: vi.fn().mockResolvedValue(undefined),
  addMessage: vi.fn(),
  warn: vi.fn(),
})

describe('installConfirmedApps', () => {
  it('sends each kind to its own install path', async () => {
    const deps = makeDeps()

    await installConfirmedApps([reactApp('alpha'), serviceApp('beta')], deps)

    // A React app arrives activated: an install intent implies activation.
    expect(deps.installApp).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'alpha' }),
      { activate: true },
    )
    expect(deps.addService).toHaveBeenCalledWith('https://svc.example.com/beta')
    expect(deps.addService).toHaveBeenCalledTimes(1)
    expect(deps.installApp).toHaveBeenCalledTimes(1)
  })

  it('reports each install by name', async () => {
    const deps = makeDeps()

    await installConfirmedApps([reactApp('alpha'), serviceApp('beta')], deps)

    expect(deps.addMessage.mock.calls.map((c) => c[0].message)).toEqual([
      'Added App alpha',
      'Added beta',
    ])
  })

  it('keeps installing after one app fails, and says which failed', async () => {
    // The regression that matters: a link may carry several apps, and one dead
    // endpoint must not silently abandon the ones after it.
    const deps = makeDeps()
    deps.addService.mockRejectedValueOnce(new Error('endpoint down'))

    await installConfirmedApps(
      [serviceApp('bad'), reactApp('alpha'), serviceApp('good')],
      deps,
    )

    expect(deps.addMessage.mock.calls.map((c) => c[0].message)).toEqual([
      'Failed to add bad from https://svc.example.com/bad: endpoint down',
      'Added App alpha',
      'Added good',
    ])
    expect(deps.installApp).toHaveBeenCalledTimes(1)
    expect(deps.addService).toHaveBeenCalledTimes(2)
    expect(deps.warn).toHaveBeenCalledTimes(1)
  })

  it('installs sequentially rather than all at once', async () => {
    const order: string[] = []
    const deps = makeDeps()
    deps.addService.mockImplementation(async (url: string) => {
      order.push(`start ${url}`)
      await new Promise((resolve) => setTimeout(resolve, 5))
      order.push(`end ${url}`)
    })

    await installConfirmedApps([serviceApp('one'), serviceApp('two')], deps)

    expect(order).toEqual([
      'start https://svc.example.com/one',
      'end https://svc.example.com/one',
      'start https://svc.example.com/two',
      'end https://svc.example.com/two',
    ])
  })

  it('does nothing when the user confirmed nothing', async () => {
    const deps = makeDeps()

    await installConfirmedApps([], deps)

    expect(deps.installApp).not.toHaveBeenCalled()
    expect(deps.addService).not.toHaveBeenCalled()
    expect(deps.addMessage).not.toHaveBeenCalled()
  })
})
