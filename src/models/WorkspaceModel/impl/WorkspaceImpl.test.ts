import { Workspace } from '../Workspace'
import { createWorkspace, DEF_WORKSPACE_NAME } from './workspaceImpl'

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
})
