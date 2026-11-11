// @vitest-environment node
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
  installApp: vi.fn().mockResolvedValue({ kind: 'new' }),
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

  // An app the catalog already has is updated or kept, not added (§7.5), and
  // "Added" would hide which version the user now runs.
  it('says an app was updated or kept rather than added', async () => {
    const deps = makeDeps()
    deps.installApp
      .mockResolvedValueOnce({ kind: 'update', from: '1.0.0', to: '1.1.0' })
      .mockResolvedValueOnce({
        kind: 'older',
        installed: '1.1.0',
        offered: '1.0.0',
      })

    await installConfirmedApps([reactApp('alpha'), reactApp('beta')], deps)

    expect(deps.addMessage.mock.calls.map((c) => c[0])).toEqual([
      expect.objectContaining({
        message: 'Updated App alpha to 1.1.0',
        severity: 'success',
      }),
      expect.objectContaining({
        message:
          'App beta 1.1.0 is already installed; kept it instead of 1.0.0',
        severity: 'info',
      }),
    ])
  })

  it('warns when the offered version cannot run here and another was kept', async () => {
    const deps = makeDeps()
    deps.installApp.mockResolvedValueOnce({
      kind: 'incompatible',
      offered: '2.0.0',
      range: '>=999.0.0',
      kept: '1.0.0',
    })

    await installConfirmedApps([reactApp('alpha')], deps)

    expect(deps.addMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'App alpha 2.0.0 needs Cytoscape Web >=999.0.0; kept 1.0.0',
        severity: 'warning',
      }),
    )
  })

  it('adds no message of its own to a rejected install', async () => {
    const deps = makeDeps()
    deps.installApp.mockResolvedValueOnce({ kind: 'rejected' })

    await installConfirmedApps([reactApp('alpha')], deps)

    // installApp already said why; "Added App alpha" would contradict it.
    expect(deps.addMessage).not.toHaveBeenCalled()
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
