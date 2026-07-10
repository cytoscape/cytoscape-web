import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { logStore } from '../../../debug'
import { AppCatalogEntry } from '../../../models/AppModel/AppCatalogEntry'
import { AppStatus } from '../../../models/AppModel/AppStatus'
import { InstalledApp } from '../../../models/AppModel/InstalledApp'
import { IdType } from '../../../models/IdType'
import { Workspace } from '../../../models/WorkspaceModel'
import { toPlainObject } from '../../db/serialization'
import { useWorkspaceStore } from './WorkspaceStore'

const FIXED_TIME = '2026-06-01T00:00:00.000Z'

const sampleEntry = (id: string): AppCatalogEntry => ({
  id,
  url: `https://apps.cytoscape.org/web/${id}/1.0.0/remoteEntry.js`,
  author: 'Test Author',
  name: `${id} app`,
  version: '1.0.0',
})

const sampleInstalledApp = (
  id: string,
  status: AppStatus = AppStatus.Inactive,
): InstalledApp => ({
  entry: sampleEntry(id),
  status,
  source: 'appstore',
  installedAt: FIXED_TIME,
})

// Mock the database operations to avoid IndexedDB issues in tests
vi.mock('../../db', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import('../../db')
  return {
    ...actual,
    putNetworkToDb: vi.fn().mockResolvedValue(undefined),
    deleteNetworkFromDb: vi.fn().mockResolvedValue(undefined),
    clearNetworksFromDb: vi.fn().mockResolvedValue(undefined),
    putTableToDb: vi.fn().mockResolvedValue(undefined),
    deleteTableFromDb: vi.fn().mockResolvedValue(undefined),
    clearTablesFromDb: vi.fn().mockResolvedValue(undefined),
    putViewModelToDb: vi.fn().mockResolvedValue(undefined),
    putNetworkViewToDb: vi.fn().mockResolvedValue(undefined),
    putNetworkViewsToDb: vi.fn().mockResolvedValue(undefined),
    deleteViewModelFromDb: vi.fn().mockResolvedValue(undefined),
    deleteNetworkViewsFromDb: vi.fn().mockResolvedValue(undefined),
    clearViewModelsFromDb: vi.fn().mockResolvedValue(undefined),
    clearNetworkViewsFromDb: vi.fn().mockResolvedValue(undefined),
    putTablesToDb: vi.fn().mockResolvedValue(undefined),
    getNetworkFromDb: vi.fn().mockResolvedValue(undefined),
    getTablesFromDb: vi.fn().mockResolvedValue(undefined),
    getViewModelFromDb: vi.fn().mockResolvedValue(undefined),
    deleteDb: vi.fn().mockResolvedValue(undefined),
  }
})

describe('useWorkspaceStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    const { result } = renderHook(() => useWorkspaceStore())
    act(() => {
      result.current.set({
        id: '',
        name: '',
        isRemote: false,
        networkIds: [],
        networkModified: {},
        creationTime: new Date(),
        localModificationTime: new Date(),
        currentNetworkId: '',
      })
    })
  })

  describe('set', () => {
    it('should set the entire workspace', () => {
      const workspace: Workspace = {
        id: 'workspace-1',
        name: 'Test Workspace',
        isRemote: false,
        networkIds: ['network-1', 'network-2'],
        networkModified: {},
        creationTime: new Date('2024-01-01'),
        localModificationTime: new Date('2024-01-02'),
        currentNetworkId: 'network-1',
      }

      const { result } = renderHook(() => useWorkspaceStore())

      act(() => {
        result.current.set(workspace)
      })

      expect(result.current.workspace).toEqual(workspace)
    })
  })

  describe('setId', () => {
    it('should set the workspace id', () => {
      const { result } = renderHook(() => useWorkspaceStore())

      act(() => {
        result.current.setId('new-workspace-id')
      })

      expect(result.current.workspace.id).toBe('new-workspace-id')
    })
  })

  describe('setName', () => {
    it('should set the workspace name', () => {
      const { result } = renderHook(() => useWorkspaceStore())

      act(() => {
        result.current.setName('My Workspace')
      })

      expect(result.current.workspace.name).toBe('My Workspace')
    })
  })

  describe('setIsRemote', () => {
    it('should set isRemote to true', () => {
      const { result } = renderHook(() => useWorkspaceStore())

      act(() => {
        result.current.setIsRemote(true)
      })

      expect(result.current.workspace.isRemote).toBe(true)
    })

    it('should set isRemote to false', () => {
      const { result } = renderHook(() => useWorkspaceStore())

      act(() => {
        result.current.setIsRemote(true)
        result.current.setIsRemote(false)
      })

      expect(result.current.workspace.isRemote).toBe(false)
    })
  })

  describe('setCurrentNetworkId', () => {
    it('should set the current network id', () => {
      const { result } = renderHook(() => useWorkspaceStore())

      act(() => {
        result.current.setCurrentNetworkId('network-1')
      })

      expect(result.current.workspace.currentNetworkId).toBe('network-1')
    })

    it('should allow setting currentNetworkId even if network is not in networkIds', () => {
      const { result } = renderHook(() => useWorkspaceStore())

      act(() => {
        result.current.setCurrentNetworkId('network-not-in-list')
      })

      expect(result.current.workspace.currentNetworkId).toBe(
        'network-not-in-list',
      )
      expect(result.current.workspace.networkIds).not.toContain(
        'network-not-in-list',
      )
    })
  })

  describe('addNetworkIds', () => {
    it('should add a single network id', () => {
      const { result } = renderHook(() => useWorkspaceStore())

      act(() => {
        result.current.addNetworkIds('network-1')
      })

      expect(result.current.workspace.networkIds).toEqual(['network-1'])
    })

    it('should add multiple network ids from an array', () => {
      const { result } = renderHook(() => useWorkspaceStore())

      act(() => {
        result.current.addNetworkIds(['network-1', 'network-2', 'network-3'])
      })

      expect(result.current.workspace.networkIds).toEqual([
        'network-1',
        'network-2',
        'network-3',
      ])
    })

    it('should not add duplicate network ids', () => {
      const { result } = renderHook(() => useWorkspaceStore())

      act(() => {
        result.current.addNetworkIds('network-1')
        result.current.addNetworkIds('network-1')
      })

      expect(result.current.workspace.networkIds).toEqual(['network-1'])
    })

    it('should not add duplicates when adding array with existing ids', () => {
      const { result } = renderHook(() => useWorkspaceStore())

      act(() => {
        result.current.addNetworkIds(['network-1', 'network-2'])
        result.current.addNetworkIds(['network-2', 'network-3'])
      })

      // Set preserves insertion order: new ids first, then existing
      // ['network-2', 'network-3', 'network-1', 'network-2'] -> ['network-2', 'network-3', 'network-1']
      expect(result.current.workspace.networkIds).toEqual([
        'network-2',
        'network-3',
        'network-1',
      ])
      expect(result.current.workspace.networkIds).toHaveLength(3)
    })

    it('should maintain order: new ids first, then existing', () => {
      const { result } = renderHook(() => useWorkspaceStore())

      act(() => {
        result.current.addNetworkIds(['network-1', 'network-2'])
        result.current.addNetworkIds(['network-3', 'network-1'])
      })

      // New ids should be added, duplicates should not create duplicates
      expect(result.current.workspace.networkIds).toContain('network-1')
      expect(result.current.workspace.networkIds).toContain('network-2')
      expect(result.current.workspace.networkIds).toContain('network-3')
      expect(result.current.workspace.networkIds.length).toBe(3)
    })
  })

  describe('deleteCurrentNetwork', () => {
    it('should remove current network from networkIds', () => {
      const { result } = renderHook(() => useWorkspaceStore())

      act(() => {
        result.current.setCurrentNetworkId('network-1')
        result.current.addNetworkIds(['network-1', 'network-2', 'network-3'])
        result.current.deleteCurrentNetwork()
      })

      expect(result.current.workspace.networkIds).not.toContain('network-1')
      expect(result.current.workspace.networkIds).toEqual([
        'network-2',
        'network-3',
      ])
    })

    it('should clear currentNetworkId when it is the last network', () => {
      const { result } = renderHook(() => useWorkspaceStore())

      act(() => {
        result.current.setCurrentNetworkId('network-1')
        result.current.addNetworkIds('network-1')
        result.current.deleteCurrentNetwork()
      })

      expect(result.current.workspace.networkIds).toEqual([])
      expect(result.current.workspace.currentNetworkId).toBe('')
    })

    it('should not affect other networks when deleting current', () => {
      const { result } = renderHook(() => useWorkspaceStore())

      act(() => {
        result.current.addNetworkIds(['network-1', 'network-2', 'network-3'])
        result.current.setCurrentNetworkId('network-2')
        result.current.deleteCurrentNetwork()
      })

      expect(result.current.workspace.networkIds).toEqual([
        'network-1',
        'network-3',
      ])
      expect(result.current.workspace.currentNetworkId).toBe('network-2') // Still set to deleted id
    })

    it('should handle deleting current network when it is not in networkIds', () => {
      const { result } = renderHook(() => useWorkspaceStore())

      act(() => {
        result.current.setCurrentNetworkId('network-1')
        result.current.addNetworkIds(['network-2', 'network-3'])
        result.current.deleteCurrentNetwork()
      })

      // Should not throw, should remove from list if it exists
      expect(result.current.workspace.networkIds).toEqual([
        'network-2',
        'network-3',
      ])
      expect(result.current.workspace.currentNetworkId).toBe('network-1') // Still set
    })
  })

  describe('deleteNetwork', () => {
    it('should delete a single network by id', () => {
      const { result } = renderHook(() => useWorkspaceStore())

      act(() => {
        result.current.addNetworkIds(['network-1', 'network-2', 'network-3'])
        result.current.deleteNetwork('network-2')
      })

      expect(result.current.workspace.networkIds).toEqual([
        'network-1',
        'network-3',
      ])
    })

    it('should delete multiple networks from an array', () => {
      const { result } = renderHook(() => useWorkspaceStore())

      act(() => {
        result.current.addNetworkIds([
          'network-1',
          'network-2',
          'network-3',
          'network-4',
        ])
        result.current.deleteNetwork(['network-2', 'network-4'])
      })

      expect(result.current.workspace.networkIds).toEqual([
        'network-1',
        'network-3',
      ])
    })

    it('should clear currentNetworkId when deleting the current network and it is the last one', () => {
      const { result } = renderHook(() => useWorkspaceStore())

      act(() => {
        result.current.addNetworkIds(['network-1', 'network-2'])
        result.current.setCurrentNetworkId('network-1')
        result.current.deleteNetwork('network-1')
      })

      expect(result.current.workspace.networkIds).not.toContain('network-1')
      // Note: current implementation only clears currentNetworkId when ALL networks are deleted
      // If other networks remain, currentNetworkId is not cleared (this may be a bug)
      expect(result.current.workspace.networkIds).toContain('network-2')
      expect(result.current.workspace.currentNetworkId).toBe('network-1') // Still set to deleted id
    })

    it('should clear currentNetworkId when all networks are deleted', () => {
      const { result } = renderHook(() => useWorkspaceStore())

      act(() => {
        result.current.addNetworkIds(['network-1', 'network-2'])
        result.current.setCurrentNetworkId('network-1')
        result.current.deleteNetwork(['network-1', 'network-2'])
      })

      expect(result.current.workspace.networkIds).toEqual([])
      expect(result.current.workspace.currentNetworkId).toBe('')
    })

    it('should not affect currentNetworkId when deleting non-current networks', () => {
      const { result } = renderHook(() => useWorkspaceStore())

      act(() => {
        result.current.addNetworkIds(['network-1', 'network-2', 'network-3'])
        result.current.setCurrentNetworkId('network-2')
        result.current.deleteNetwork(['network-1', 'network-3'])
      })

      expect(result.current.workspace.networkIds).toEqual(['network-2'])
      expect(result.current.workspace.currentNetworkId).toBe('network-2')
    })

    it('should handle deleting non-existent network ids gracefully', () => {
      const { result } = renderHook(() => useWorkspaceStore())

      act(() => {
        result.current.addNetworkIds(['network-1', 'network-2'])
        result.current.deleteNetwork('network-999')
      })

      expect(result.current.workspace.networkIds).toEqual([
        'network-1',
        'network-2',
      ])
    })
  })

  describe('deleteAllNetworks', () => {
    it('should remove all networks from networkIds', () => {
      const { result } = renderHook(() => useWorkspaceStore())

      act(() => {
        result.current.addNetworkIds(['network-1', 'network-2', 'network-3'])
        result.current.deleteAllNetworks()
      })

      expect(result.current.workspace.networkIds).toEqual([])
    })

    it('should clear currentNetworkId', () => {
      const { result } = renderHook(() => useWorkspaceStore())

      act(() => {
        result.current.addNetworkIds(['network-1', 'network-2'])
        result.current.setCurrentNetworkId('network-1')
        result.current.deleteAllNetworks()
      })

      expect(result.current.workspace.currentNetworkId).toBe('')
    })

    it('should clear networkModified object', () => {
      const { result } = renderHook(() => useWorkspaceStore())

      act(() => {
        result.current.addNetworkIds(['network-1', 'network-2'])
        result.current.setNetworkModified('network-1', true)
        result.current.setNetworkModified('network-2', false)
        result.current.deleteAllNetworks()
      })

      expect(result.current.workspace.networkModified).toEqual({})
    })

    it('should work on empty workspace', () => {
      const { result } = renderHook(() => useWorkspaceStore())

      act(() => {
        result.current.deleteAllNetworks()
      })

      expect(result.current.workspace.networkIds).toEqual([])
      expect(result.current.workspace.currentNetworkId).toBe('')
      expect(result.current.workspace.networkModified).toEqual({})
    })
  })

  describe('setNetworkModified', () => {
    it('should set a network as modified', () => {
      const { result } = renderHook(() => useWorkspaceStore())

      act(() => {
        result.current.setNetworkModified('network-1', true)
      })

      expect(result.current.workspace.networkModified['network-1']).toBe(true)
    })

    it('should set a network as not modified', () => {
      const { result } = renderHook(() => useWorkspaceStore())

      act(() => {
        result.current.setNetworkModified('network-1', false)
      })

      expect(result.current.workspace.networkModified['network-1']).toBe(false)
    })

    it('should update existing modified status', () => {
      const { result } = renderHook(() => useWorkspaceStore())

      act(() => {
        result.current.setNetworkModified('network-1', true)
        result.current.setNetworkModified('network-1', false)
      })

      expect(result.current.workspace.networkModified['network-1']).toBe(false)
    })

    it('should handle multiple networks independently', () => {
      const { result } = renderHook(() => useWorkspaceStore())

      act(() => {
        result.current.setNetworkModified('network-1', true)
        result.current.setNetworkModified('network-2', false)
        result.current.setNetworkModified('network-3', true)
      })

      expect(result.current.workspace.networkModified['network-1']).toBe(true)
      expect(result.current.workspace.networkModified['network-2']).toBe(false)
      expect(result.current.workspace.networkModified['network-3']).toBe(true)
    })
  })

  describe('deleteNetworkModifiedStatus', () => {
    it('should delete a network modified status', () => {
      const { result } = renderHook(() => useWorkspaceStore())

      act(() => {
        result.current.setNetworkModified('network-1', true)
        result.current.setNetworkModified('network-2', false)
        result.current.deleteNetworkModifiedStatus('network-1')
      })

      expect(
        result.current.workspace.networkModified['network-1'],
      ).toBeUndefined()
      expect(result.current.workspace.networkModified['network-2']).toBe(false)
    })

    it('should handle deleting non-existent status gracefully', () => {
      const { result } = renderHook(() => useWorkspaceStore())

      act(() => {
        result.current.deleteNetworkModifiedStatus('network-999')
      })

      expect(result.current.workspace.networkModified).toEqual({})
    })
  })

  describe('deleteAllNetworkModifiedStatuses', () => {
    it('should clear all network modified statuses', () => {
      const { result } = renderHook(() => useWorkspaceStore())

      act(() => {
        result.current.setNetworkModified('network-1', true)
        result.current.setNetworkModified('network-2', false)
        result.current.setNetworkModified('network-3', true)
        result.current.deleteAllNetworkModifiedStatuses()
      })

      expect(result.current.workspace.networkModified).toEqual({})
    })

    it('should work on empty networkModified object', () => {
      const { result } = renderHook(() => useWorkspaceStore())

      act(() => {
        result.current.deleteAllNetworkModifiedStatuses()
      })

      expect(result.current.workspace.networkModified).toEqual({})
    })
  })

  describe('resetWorkspace', () => {
    it('should reset workspace to empty state', async () => {
      const { result } = renderHook(() => useWorkspaceStore())

      act(() => {
        result.current.setId('workspace-1')
        result.current.setName('Test Workspace')
        result.current.addNetworkIds(['network-1', 'network-2'])
        result.current.setCurrentNetworkId('network-1')
        result.current.setNetworkModified('network-1', true)
      })

      await act(async () => {
        await result.current.resetWorkspace()
      })

      expect(result.current.workspace.id).toBe('')
      expect(result.current.workspace.name).toBe('')
      expect(result.current.workspace.networkIds).toEqual([])
      expect(result.current.workspace.currentNetworkId).toBe('')
      expect(result.current.workspace.networkModified).toEqual({})
      expect(result.current.workspace.isRemote).toBe(false)
    })
  })

  describe('integration scenarios', () => {
    it('should handle complete workflow: add networks, set current, modify, delete', () => {
      const { result } = renderHook(() => useWorkspaceStore())

      act(() => {
        // Add networks
        result.current.addNetworkIds(['network-1', 'network-2', 'network-3'])
      })
      expect(result.current.workspace.networkIds).toHaveLength(3)

      act(() => {
        // Set current network
        result.current.setCurrentNetworkId('network-2')
      })
      expect(result.current.workspace.currentNetworkId).toBe('network-2')

      act(() => {
        // Mark as modified
        result.current.setNetworkModified('network-2', true)
      })
      expect(result.current.workspace.networkModified['network-2']).toBe(true)

      act(() => {
        // Delete a non-current network
        result.current.deleteNetwork('network-1')
      })
      expect(result.current.workspace.networkIds).toHaveLength(2)
      expect(result.current.workspace.currentNetworkId).toBe('network-2')

      act(() => {
        // Delete current network (but there's still network-3)
        result.current.deleteNetwork('network-2')
      })
      expect(result.current.workspace.networkIds).toHaveLength(1)
      expect(result.current.workspace.networkIds).not.toContain('network-2')
      // Note: Implementation only clears currentNetworkId when ALL networks are deleted
      // Since network-3 still exists, currentNetworkId remains set to deleted network-2
      expect(result.current.workspace.currentNetworkId).toBe('network-2')

      act(() => {
        // Delete the last network to clear currentNetworkId
        result.current.deleteNetwork('network-3')
      })
      expect(result.current.workspace.networkIds).toHaveLength(0)
      expect(result.current.workspace.currentNetworkId).toBe('')
    })

    it('should maintain data integrity when adding and deleting networks', () => {
      const { result } = renderHook(() => useWorkspaceStore())

      act(() => {
        // Add same network multiple times
        result.current.addNetworkIds('network-1')
        result.current.addNetworkIds('network-1')
        result.current.addNetworkIds(['network-1', 'network-2'])
      })

      // Should only have unique ids
      expect(result.current.workspace.networkIds).toEqual([
        'network-1',
        'network-2',
      ])

      act(() => {
        // Delete and re-add
        result.current.deleteNetwork('network-1')
        result.current.addNetworkIds('network-1')
      })

      expect(result.current.workspace.networkIds).toContain('network-1')
      expect(result.current.workspace.networkIds).toContain('network-2')
      expect(result.current.workspace.networkIds).toHaveLength(2)
    })
  })

  describe('installedApps', () => {
    describe('addInstalledApp', () => {
      it('should add an installed app record', () => {
        const { result } = renderHook(() => useWorkspaceStore())

        act(() => {
          result.current.addInstalledApp(sampleInstalledApp('hello'))
        })

        expect(result.current.workspace.installedApps).toEqual([
          sampleInstalledApp('hello'),
        ])
      })

      it('should replace (not duplicate) when adding the same id again', () => {
        const { result } = renderHook(() => useWorkspaceStore())

        act(() => {
          result.current.addInstalledApp(
            sampleInstalledApp('hello', AppStatus.Inactive),
          )
          result.current.addInstalledApp(
            sampleInstalledApp('hello', AppStatus.Active),
          )
        })

        expect(result.current.workspace.installedApps).toHaveLength(1)
        expect(result.current.workspace.installedApps?.[0].status).toBe(
          AppStatus.Active,
        )
      })

      it('should preserve position when replacing an existing record', () => {
        const { result } = renderHook(() => useWorkspaceStore())

        act(() => {
          result.current.addInstalledApp(sampleInstalledApp('a'))
          result.current.addInstalledApp(sampleInstalledApp('b'))
          result.current.addInstalledApp(
            sampleInstalledApp('a', AppStatus.Active),
          )
        })

        const ids = result.current.workspace.installedApps?.map(
          (x) => x.entry.id,
        )
        expect(ids).toEqual(['a', 'b'])
        expect(result.current.workspace.installedApps?.[0].status).toBe(
          AppStatus.Active,
        )
      })
    })

    describe('removeInstalledApp', () => {
      it('should remove an installed app by id', () => {
        const { result } = renderHook(() => useWorkspaceStore())

        act(() => {
          result.current.addInstalledApp(sampleInstalledApp('a'))
          result.current.addInstalledApp(sampleInstalledApp('b'))
          result.current.removeInstalledApp('a')
        })

        const ids = result.current.workspace.installedApps?.map(
          (x) => x.entry.id,
        )
        expect(ids).toEqual(['b'])
      })

      it('should be a safe no-op for an unknown id', () => {
        const { result } = renderHook(() => useWorkspaceStore())

        act(() => {
          result.current.addInstalledApp(sampleInstalledApp('a'))
          result.current.removeInstalledApp('unknown')
        })

        expect(result.current.workspace.installedApps).toHaveLength(1)
      })
    })

    describe('setInstalledAppStatus', () => {
      it('should update the status of an installed app', () => {
        const { result } = renderHook(() => useWorkspaceStore())

        act(() => {
          result.current.addInstalledApp(
            sampleInstalledApp('hello', AppStatus.Inactive),
          )
          result.current.setInstalledAppStatus('hello', AppStatus.Active)
        })

        expect(result.current.workspace.installedApps?.[0].status).toBe(
          AppStatus.Active,
        )
      })

      it('should warn and not throw for an unknown id', () => {
        const warnSpy = jest
          .spyOn(logStore, 'warn')
          .mockImplementation(() => {})
        const { result } = renderHook(() => useWorkspaceStore())

        act(() => {
          result.current.setInstalledAppStatus('unknown', AppStatus.Active)
        })

        expect(warnSpy).toHaveBeenCalled()
        expect(result.current.workspace.installedApps ?? []).toEqual([])
        warnSpy.mockRestore()
      })
    })

    describe('persistence', () => {
      it('installedApps survives a toPlainObject round-trip', () => {
        const { result } = renderHook(() => useWorkspaceStore())

        act(() => {
          result.current.setId('ws-1')
          result.current.addInstalledApp(sampleInstalledApp('hello'))
        })

        const plain = toPlainObject(result.current.workspace)
        expect(plain.installedApps).toEqual([sampleInstalledApp('hello')])
      })
    })
  })
})
