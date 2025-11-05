import { IdType } from '../../IdType'
import { Workspace } from '../Workspace'
import {
  addNetworkIds,
  createWorkspace,
  DEF_WORKSPACE_NAME,
  deleteAllNetworkModifiedStatuses,
  deleteAllNetworks,
  deleteCurrentNetwork,
  deleteNetwork,
  deleteNetworkModifiedStatus,
  setIsRemote,
  setId,
  setCurrentNetworkId,
  setName,
  setNetworkModified,
} from './workspaceImpl'

// to run these: npx jest src/models/WorkspaceModel/impl/workspaceImpl.test.ts

describe('WorkspaceImpl', () => {
  describe('createWorkspace', () => {
    it('should create a new workspace with default values', () => {
      const workspace = createWorkspace()

      expect(workspace.name).toBe(DEF_WORKSPACE_NAME)
      expect(workspace.networkIds).toEqual([])
      expect(workspace.networkModified).toEqual({})
      expect(workspace.currentNetworkId).toBe('')
      expect(workspace.isRemote).toBe(false)
      expect(workspace.id).toBeDefined()
      expect(workspace.creationTime).toBeInstanceOf(Date)
      expect(workspace.localModificationTime).toBeInstanceOf(Date)
    })

    it('should generate a unique id for each workspace', () => {
      const workspace1 = createWorkspace()
      const workspace2 = createWorkspace()

      expect(workspace1.id).toBeDefined()
      expect(workspace2.id).toBeDefined()
      expect(workspace1.id).not.toBe(workspace2.id)
    })

    it('should set creation time to current time', () => {
      const beforeTime = new Date()
      const workspace = createWorkspace()
      const afterTime = new Date()

      expect(workspace.creationTime.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime(),
      )
      expect(workspace.creationTime.getTime()).toBeLessThanOrEqual(
        afterTime.getTime(),
      )
    })

    it('should set local modification time to current time', () => {
      const beforeTime = new Date()
      const workspace = createWorkspace()
      const afterTime = new Date()

      expect(workspace.localModificationTime.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime(),
      )
      expect(workspace.localModificationTime.getTime()).toBeLessThanOrEqual(
        afterTime.getTime(),
      )
    })

    it('should set creation and modification times to same value', () => {
      const workspace = createWorkspace()

      expect(workspace.creationTime.getTime()).toBe(
        workspace.localModificationTime.getTime(),
      )
    })

    it('should create workspace with empty networkIds array', () => {
      const workspace = createWorkspace()

      expect(workspace.networkIds).toEqual([])
      expect(Array.isArray(workspace.networkIds)).toBe(true)
    })

    it('should create workspace with empty networkModified object', () => {
      const workspace = createWorkspace()

      expect(workspace.networkModified).toEqual({})
      expect(typeof workspace.networkModified).toBe('object')
    })

    it('should create workspace with isRemote set to false', () => {
      const workspace = createWorkspace()

      expect(workspace.isRemote).toBe(false)
    })

    it('should create workspace with empty currentNetworkId', () => {
      const workspace = createWorkspace()

      expect(workspace.currentNetworkId).toBe('')
    })
  })

  describe('DEF_WORKSPACE_NAME', () => {
    it('should have the correct default workspace name', () => {
      expect(DEF_WORKSPACE_NAME).toBe('Untitled Workspace')
    })
  })

  describe('setId', () => {
    it('should set the workspace id', () => {
      const workspace = createWorkspace()
      const newId: IdType = 'new-workspace-id'

      const result = setId(workspace, newId)

      expect(result.id).toBe(newId)
      expect(result).not.toBe(workspace) // Immutability check
      expect(workspace.id).not.toBe(newId) // Original unchanged
    })
  })

  describe('setName', () => {
    it('should set the workspace name', () => {
      const workspace = createWorkspace()
      const newName = 'My Workspace'

      const result = setName(workspace, newName)

      expect(result.name).toBe(newName)
      expect(result).not.toBe(workspace) // Immutability check
      expect(workspace.name).toBe(DEF_WORKSPACE_NAME) // Original unchanged
    })
  })

  describe('setIsRemote', () => {
    it('should set isRemote to true', () => {
      const workspace = createWorkspace()

      const result = setIsRemote(workspace, true)

      expect(result.isRemote).toBe(true)
      expect(result).not.toBe(workspace) // Immutability check
      expect(workspace.isRemote).toBe(false) // Original unchanged
    })

    it('should set isRemote to false', () => {
      const workspace = { ...createWorkspace(), isRemote: true }

      const result = setIsRemote(workspace, false)

      expect(result.isRemote).toBe(false)
      expect(result).not.toBe(workspace) // Immutability check
      expect(workspace.isRemote).toBe(true) // Original unchanged
    })
  })

  describe('setCurrentNetworkId', () => {
    it('should set the current network id', () => {
      const workspace = createWorkspace()
      const networkId: IdType = 'network-1'

      const result = setCurrentNetworkId(workspace, networkId)

      expect(result.currentNetworkId).toBe(networkId)
      expect(result).not.toBe(workspace) // Immutability check
      expect(workspace.currentNetworkId).toBe('') // Original unchanged
    })
  })

  describe('addNetworkIds', () => {
    it('should add a single network id', () => {
      const workspace = createWorkspace()
      const networkId: IdType = 'network-1'

      const result = addNetworkIds(workspace, networkId)

      expect(result.networkIds).toEqual([networkId])
      expect(result).not.toBe(workspace) // Immutability check
      expect(workspace.networkIds).toEqual([]) // Original unchanged
    })

    it('should add multiple network ids from an array', () => {
      const workspace = createWorkspace()
      const networkIds: IdType[] = ['network-1', 'network-2', 'network-3']

      const result = addNetworkIds(workspace, networkIds)

      expect(result.networkIds).toEqual(['network-1', 'network-2', 'network-3'])
      expect(result).not.toBe(workspace) // Immutability check
    })

    it('should not add duplicate network ids', () => {
      const workspace = { ...createWorkspace(), networkIds: ['network-1'] }

      const result = addNetworkIds(workspace, 'network-1')

      expect(result.networkIds).toEqual(['network-1'])
      expect(result.networkIds.length).toBe(1)
    })

    it('should not add duplicates when adding array with existing ids', () => {
      const workspace = {
        ...createWorkspace(),
        networkIds: ['network-1', 'network-2'],
      }

      const result = addNetworkIds(workspace, ['network-2', 'network-3'])

      // Set preserves insertion order: new ids first, then existing
      // ['network-2', 'network-3', 'network-1', 'network-2'] -> ['network-2', 'network-3', 'network-1']
      expect(result.networkIds).toEqual(['network-2', 'network-3', 'network-1'])
      expect(result.networkIds.length).toBe(3)
    })

    it('should preserve other workspace properties', () => {
      const workspace = createWorkspace()
      const originalId = workspace.id
      const originalName = workspace.name

      const result = addNetworkIds(workspace, 'network-1')

      expect(result.id).toBe(originalId)
      expect(result.name).toBe(originalName)
      expect(result.networkModified).toEqual(workspace.networkModified)
    })
  })

  describe('deleteCurrentNetwork', () => {
    it('should remove current network from networkIds', () => {
      const workspace: Workspace = {
        ...createWorkspace(),
        networkIds: ['network-1', 'network-2', 'network-3'],
        currentNetworkId: 'network-1',
      }

      const result = deleteCurrentNetwork(workspace)

      expect(result.networkIds).not.toContain('network-1')
      expect(result.networkIds).toEqual(['network-2', 'network-3'])
      expect(result).not.toBe(workspace) // Immutability check
      expect(workspace.networkIds).toContain('network-1') // Original unchanged
    })

    it('should clear currentNetworkId when it is the last network', () => {
      const workspace: Workspace = {
        ...createWorkspace(),
        networkIds: ['network-1'],
        currentNetworkId: 'network-1',
      }

      const result = deleteCurrentNetwork(workspace)

      expect(result.networkIds).toEqual([])
      expect(result.currentNetworkId).toBe('')
    })

    it('should not clear currentNetworkId when other networks remain', () => {
      const workspace: Workspace = {
        ...createWorkspace(),
        networkIds: ['network-1', 'network-2'],
        currentNetworkId: 'network-1',
      }

      const result = deleteCurrentNetwork(workspace)

      expect(result.networkIds).toEqual(['network-2'])
      expect(result.currentNetworkId).toBe('network-1') // Still set
    })
  })

  describe('deleteAllNetworks', () => {
    it('should remove all networks from networkIds', () => {
      const workspace: Workspace = {
        ...createWorkspace(),
        networkIds: ['network-1', 'network-2', 'network-3'],
      }

      const result = deleteAllNetworks(workspace)

      expect(result.networkIds).toEqual([])
      expect(result).not.toBe(workspace) // Immutability check
      expect(workspace.networkIds.length).toBe(3) // Original unchanged
    })

    it('should clear currentNetworkId', () => {
      const workspace: Workspace = {
        ...createWorkspace(),
        networkIds: ['network-1', 'network-2'],
        currentNetworkId: 'network-1',
      }

      const result = deleteAllNetworks(workspace)

      expect(result.currentNetworkId).toBe('')
    })

    it('should clear networkModified object', () => {
      const workspace: Workspace = {
        ...createWorkspace(),
        networkIds: ['network-1', 'network-2'],
        networkModified: { 'network-1': true, 'network-2': false },
      }

      const result = deleteAllNetworks(workspace)

      expect(result.networkModified).toEqual({})
    })
  })

  describe('deleteNetwork', () => {
    it('should delete a single network by id', () => {
      const workspace: Workspace = {
        ...createWorkspace(),
        networkIds: ['network-1', 'network-2', 'network-3'],
      }

      const result = deleteNetwork(workspace, 'network-2')

      expect(result.networkIds).toEqual(['network-1', 'network-3'])
      expect(result).not.toBe(workspace) // Immutability check
      expect(workspace.networkIds.length).toBe(3) // Original unchanged
    })

    it('should delete multiple networks from an array', () => {
      const workspace: Workspace = {
        ...createWorkspace(),
        networkIds: ['network-1', 'network-2', 'network-3', 'network-4'],
      }

      const result = deleteNetwork(workspace, ['network-2', 'network-4'])

      expect(result.networkIds).toEqual(['network-1', 'network-3'])
    })

    it('should clear currentNetworkId when deleting the current network and it is the last one', () => {
      const workspace: Workspace = {
        ...createWorkspace(),
        networkIds: ['network-1'],
        currentNetworkId: 'network-1',
      }

      const result = deleteNetwork(workspace, 'network-1')

      expect(result.networkIds).not.toContain('network-1')
      expect(result.currentNetworkId).toBe('')
    })

    it('should clear currentNetworkId when all networks are deleted', () => {
      const workspace: Workspace = {
        ...createWorkspace(),
        networkIds: ['network-1', 'network-2'],
        currentNetworkId: 'network-1',
      }

      const result = deleteNetwork(workspace, ['network-1', 'network-2'])

      expect(result.networkIds).toEqual([])
      expect(result.currentNetworkId).toBe('')
    })

    it('should not clear currentNetworkId when deleting non-current networks', () => {
      const workspace: Workspace = {
        ...createWorkspace(),
        networkIds: ['network-1', 'network-2', 'network-3'],
        currentNetworkId: 'network-2',
      }

      const result = deleteNetwork(workspace, ['network-1', 'network-3'])

      expect(result.networkIds).toEqual(['network-2'])
      expect(result.currentNetworkId).toBe('network-2')
    })

    it('should handle deleting non-existent network ids gracefully', () => {
      const workspace: Workspace = {
        ...createWorkspace(),
        networkIds: ['network-1', 'network-2'],
      }

      const result = deleteNetwork(workspace, 'network-999')

      expect(result.networkIds).toEqual(['network-1', 'network-2'])
    })
  })

  describe('setNetworkModified', () => {
    it('should set a network as modified', () => {
      const workspace = createWorkspace()
      const networkId: IdType = 'network-1'

      const result = setNetworkModified(workspace, networkId, true)

      expect(result.networkModified[networkId]).toBe(true)
      expect(result).not.toBe(workspace) // Immutability check
      expect(workspace.networkModified[networkId]).toBeUndefined() // Original unchanged
    })

    it('should set a network as not modified', () => {
      const workspace = createWorkspace()
      const networkId: IdType = 'network-1'

      const result = setNetworkModified(workspace, networkId, false)

      expect(result.networkModified[networkId]).toBe(false)
    })

    it('should update existing modified status', () => {
      const workspace: Workspace = {
        ...createWorkspace(),
        networkModified: { 'network-1': true },
      }

      const result = setNetworkModified(workspace, 'network-1', false)

      expect(result.networkModified['network-1']).toBe(false)
    })

    it('should handle multiple networks independently', () => {
      const workspace = createWorkspace()

      let result = setNetworkModified(workspace, 'network-1', true)
      result = setNetworkModified(result, 'network-2', false)
      result = setNetworkModified(result, 'network-3', true)

      expect(result.networkModified['network-1']).toBe(true)
      expect(result.networkModified['network-2']).toBe(false)
      expect(result.networkModified['network-3']).toBe(true)
    })

    it('should preserve other networkModified entries', () => {
      const workspace: Workspace = {
        ...createWorkspace(),
        networkModified: { 'network-1': true, 'network-2': false },
      }

      const result = setNetworkModified(workspace, 'network-3', true)

      expect(result.networkModified['network-1']).toBe(true)
      expect(result.networkModified['network-2']).toBe(false)
      expect(result.networkModified['network-3']).toBe(true)
    })
  })

  describe('deleteNetworkModifiedStatus', () => {
    it('should delete a network modified status', () => {
      const workspace: Workspace = {
        ...createWorkspace(),
        networkModified: { 'network-1': true, 'network-2': false },
      }

      const result = deleteNetworkModifiedStatus(workspace, 'network-1')

      expect(result.networkModified['network-1']).toBeUndefined()
      expect(result.networkModified['network-2']).toBe(false)
      expect(result).not.toBe(workspace) // Immutability check
      expect(workspace.networkModified['network-1']).toBe(true) // Original unchanged
    })

    it('should handle deleting non-existent status gracefully', () => {
      const workspace: Workspace = {
        ...createWorkspace(),
        networkModified: { 'network-1': true },
      }

      const result = deleteNetworkModifiedStatus(workspace, 'network-999')

      expect(result.networkModified).toEqual({ 'network-1': true })
    })
  })

  describe('deleteAllNetworkModifiedStatuses', () => {
    it('should clear all network modified statuses', () => {
      const workspace: Workspace = {
        ...createWorkspace(),
        networkModified: {
          'network-1': true,
          'network-2': false,
          'network-3': true,
        },
      }

      const result = deleteAllNetworkModifiedStatuses(workspace)

      expect(result.networkModified).toEqual({})
      expect(result).not.toBe(workspace) // Immutability check
      expect(workspace.networkModified).not.toEqual({}) // Original unchanged
    })

    it('should work on empty networkModified object', () => {
      const workspace = createWorkspace()

      const result = deleteAllNetworkModifiedStatuses(workspace)

      expect(result.networkModified).toEqual({})
    })
  })

  describe('immutability', () => {
    it('should not mutate the original workspace in any operation', () => {
      const original = createWorkspace()
      const originalId = original.id
      const originalName = original.name
      const originalNetworkIds = [...original.networkIds]

      // Perform various operations
      let workspace = setId(original, 'new-id')
      workspace = setName(workspace, 'New Name')
      workspace = addNetworkIds(workspace, ['network-1', 'network-2'])
      workspace = setCurrentNetworkId(workspace, 'network-1')
      workspace = setNetworkModified(workspace, 'network-1', true)

      // Verify original is unchanged
      expect(original.id).toBe(originalId)
      expect(original.name).toBe(originalName)
      expect(original.networkIds).toEqual(originalNetworkIds)
      expect(original.currentNetworkId).toBe('')
      expect(original.networkModified).toEqual({})
    })
  })
})
