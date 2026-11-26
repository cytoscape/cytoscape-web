import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppStatus } from '../../models/AppModel/AppStatus'
import { InstalledApp } from '../../models/AppModel/InstalledApp'
import { createNdexWorkspace, updateNdexWorkspace } from '../external-api/ndex'
import { deriveAppOptions, useSaveWorkspace } from './useSaveWorkspaceToNDEx'

const addMessage = vi.fn()
const setId = vi.fn()
const setIsRemote = vi.fn()
const setName = vi.fn()

vi.mock('./stores/MessageStore', () => ({
  useMessageStore: (selector: (state: unknown) => unknown) =>
    selector({ addMessage }),
}))

vi.mock('./stores/WorkspaceStore', () => ({
  useWorkspaceStore: (selector: (state: unknown) => unknown) =>
    selector({
      deleteNetworkModifiedStatus: vi.fn(),
      setId,
      setName,
      setIsRemote,
    }),
}))

vi.mock('../db', () => ({
  getWorkspaceFromDb: vi.fn().mockResolvedValue({
    currentNetworkId: 'n1',
    networkIds: ['n1'],
    installedApps: [],
  }),
}))

vi.mock('../external-api/ndex', () => ({
  createNdexWorkspace: vi.fn(),
  updateNdexWorkspace: vi.fn(),
  TimeOutErrorIndicator: 'timeout',
  TimeOutErrorMessage: 'timed out',
}))

vi.mock('./useLoadCyNetwork', () => ({ useLoadCyNetwork: () => vi.fn() }))
vi.mock('./useSaveCyNetworkToNDEx', () => ({
  useSaveCyNetworkToNDEx: () => vi.fn(),
}))
vi.mock('./useSaveCyNetworkCopyToNDEx', () => ({
  useSaveCyNetworkCopyToNDEx: () => vi.fn(),
}))

const installed = (id: string, status: AppStatus): InstalledApp => ({
  entry: {
    id,
    url: `https://apps.cytoscape.org/web/${id}/1.0.0/remoteEntry.js`,
    author: 'Test',
  },
  status,
  source: 'appstore',
  installedAt: '2026-06-01T00:00:00.000Z',
})

describe('deriveAppOptions', () => {
  it('returns empty options for undefined installedApps', () => {
    expect(deriveAppOptions(undefined)).toEqual({
      activeApps: [],
      installedApps: [],
    })
  })

  it('serializes the full installedApps list', () => {
    const list = [
      installed('a', AppStatus.Active),
      installed('b', AppStatus.Inactive),
    ]
    expect(deriveAppOptions(list).installedApps).toBe(list)
  })

  it('derives activeApps (ids) from entries with Active status', () => {
    const list = [
      installed('a', AppStatus.Active),
      installed('b', AppStatus.Inactive),
      installed('c', AppStatus.Active),
    ]
    expect(deriveAppOptions(list).activeApps).toEqual(['a', 'c'])
  })
})

// No networks to save, so only the workspace save itself runs.
const runSave = (
  saveWorkspace: ReturnType<typeof useSaveWorkspace>,
  isUpdate: boolean,
) =>
  saveWorkspace(
    'token',
    [],
    {},
    new Map(),
    {},
    {},
    {},
    {},
    {},
    {},
    isUpdate,
    'My workspace',
    'local-workspace-id',
    {},
    {},
  )

// #541: one failed workspace save showed two error banners, one from
// saveWorkspace and one from its caller. Callers word the message for their
// action, so saveWorkspace reports a failure only by rejecting.
describe('useSaveWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    ['creating', false, createNdexWorkspace],
    ['updating', true, updateNdexWorkspace],
  ])(
    'rejects without its own error banner when %s the workspace fails',
    async (_action, isUpdate, ndexCall) => {
      vi.mocked(ndexCall).mockRejectedValue(new Error('NDEx is down'))
      const { result } = renderHook(() => useSaveWorkspace())

      await act(async () => {
        await expect(runSave(result.current, isUpdate)).rejects.toThrow(
          'NDEx is down',
        )
      })

      expect(addMessage).not.toHaveBeenCalled()
    },
  )

  it('does not store a missing workspace id from NDEx', async () => {
    vi.mocked(createNdexWorkspace).mockResolvedValue({ uuid: '' })
    const { result } = renderHook(() => useSaveWorkspace())

    await act(async () => {
      await expect(runSave(result.current, false)).rejects.toThrow(
        'NDEx did not return a valid workspace id',
      )
    })

    expect(setId).not.toHaveBeenCalled()
    expect(setIsRemote).not.toHaveBeenCalled()
  })

  it('stores the new workspace id and reports success', async () => {
    vi.mocked(createNdexWorkspace).mockResolvedValue({ uuid: 'ndex-uuid' })
    const { result } = renderHook(() => useSaveWorkspace())

    await act(async () => {
      await runSave(result.current, false)
    })

    expect(setId).toHaveBeenCalledWith('ndex-uuid')
    expect(addMessage).toHaveBeenCalledTimes(1)
    expect(addMessage.mock.calls[0][0].message).toBe(
      'Saved workspace to NDEx successfully.',
    )
  })
})
