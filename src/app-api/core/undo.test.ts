// @vitest-environment node
// src/app-api/core/undo.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { UndoCommandType } from '../../models/StoreModel/UndoStoreModel'

const mockSetUndoStack = vi.fn()
const mockSetRedoStack = vi.fn()
const mockUndoRedoStacks: Record<string, any> = {}

const mockSetNetworkModified = vi.fn()

/** Networks already marked modified, so the mark guard can be exercised. */
const mockNetworkModified: Record<string, boolean> = {}

vi.mock('../../data/hooks/stores/WorkspaceStore', () => ({
  useWorkspaceStore: {
    getState: vi.fn(() => ({
      workspace: { networkModified: mockNetworkModified },
      setNetworkModified: mockSetNetworkModified,
    })),
  },
}))

vi.mock('../../data/hooks/stores/UndoStore', () => ({
  useUndoStore: {
    getState: vi.fn(() => ({
      undoRedoStacks: mockUndoRedoStacks,
      setUndoStack: mockSetUndoStack,
      setRedoStack: mockSetRedoStack,
    })),
  },
}))

/** Import corePostEdit against a config with the given undoStackSize */
async function coreUndoWithStackSize(undoStackSize: number) {
  vi.resetModules()
  vi.doMock('@/assets/config.json', () => ({
    default: { undoStackSize },
  }))
  return await import('./undo')
}

function postEdits(
  corePostEdit: (
    networkId: string,
    c: UndoCommandType,
    d: string,
    u: any[],
    r: any[],
  ) => void,
  count: number,
): void {
  for (let i = 0; i < count; i++) {
    // Feed each call the stack the previous one produced, as the real
    // store would
    mockUndoRedoStacks['net1'] = {
      undoStack: mockSetUndoStack.mock.calls.at(-1)?.[1] ?? [],
      redoStack: [],
    }
    corePostEdit(
      'net1',
      UndoCommandType.CREATE_NODES,
      `edit ${i}`,
      ['net1'],
      ['net1'],
    )
  }
}

describe('corePostEdit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockUndoRedoStacks).forEach((k) => delete mockUndoRedoStacks[k])
    Object.keys(mockNetworkModified).forEach(
      (k) => delete mockNetworkModified[k],
    )
  })

  it('caps the undo stack at the configured undoStackSize', async () => {
    const { corePostEdit } = await coreUndoWithStackSize(3)

    postEdits(corePostEdit, 5)

    const finalStack = mockSetUndoStack.mock.calls.at(-1)?.[1]
    expect(finalStack).toHaveLength(3)
    expect(finalStack.map((e: any) => e.description)).toEqual([
      'edit 2',
      'edit 3',
      'edit 4',
    ])
  })

  it('treats undoStackSize 0 as disabled, not unbounded (slice(-0) trap)', async () => {
    const { corePostEdit } = await coreUndoWithStackSize(0)

    postEdits(corePostEdit, 2)

    expect(mockSetUndoStack).toHaveBeenLastCalledWith('net1', [])
  })

  it('clears the redo stack of the network it recorded against', async () => {
    const { corePostEdit } = await coreUndoWithStackSize(20)

    postEdits(corePostEdit, 1)

    expect(mockSetRedoStack).toHaveBeenCalledWith('net1', [])
  })

  it('marks the recorded network modified', async () => {
    const { corePostEdit } = await coreUndoWithStackSize(20)

    postEdits(corePostEdit, 1)

    expect(mockSetNetworkModified).toHaveBeenCalledWith('net1', true)
  })

  it('marks the network modified even when undo is disabled', async () => {
    // The mark runs before the UNDO_STACK_SIZE branch: a deployment with
    // undoStackSize: 0 still has to offer the network to Save to NDEx (#680).
    const { corePostEdit } = await coreUndoWithStackSize(0)

    postEdits(corePostEdit, 1)

    expect(mockSetNetworkModified).toHaveBeenCalledWith('net1', true)
  })
})

describe('markNetworkModified', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockNetworkModified).forEach(
      (k) => delete mockNetworkModified[k],
    )
  })

  it('marks the network it is given, never the current one', async () => {
    const { markNetworkModified } = await coreUndoWithStackSize(20)

    markNetworkModified('net2')

    expect(mockSetNetworkModified).toHaveBeenCalledExactlyOnceWith('net2', true)
  })

  it('does not touch the store when the network is already marked', async () => {
    // `workspaceImpl.setNetworkModified` rebuilds the workspace object, so a
    // redundant write re-renders every component selecting `state.workspace`
    // and makes the persist middleware stringify the workspace twice to
    // decide it need not write. postEdit runs this on every recorded edit —
    // one per node-drag mouse-up.
    const { markNetworkModified } = await coreUndoWithStackSize(20)
    mockNetworkModified.net1 = true

    markNetworkModified('net1')

    expect(mockSetNetworkModified).not.toHaveBeenCalled()
  })

  it('marks a network whose flag was explicitly cleared', async () => {
    // Cleared by a save (`setNetworkModified(id, false)`) rather than
    // removed — the guard must only skip on `true`.
    const { markNetworkModified } = await coreUndoWithStackSize(20)
    mockNetworkModified.net1 = false

    markNetworkModified('net1')

    expect(mockSetNetworkModified).toHaveBeenCalledExactlyOnceWith('net1', true)
  })
})
