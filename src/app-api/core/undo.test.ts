// @vitest-environment node
// src/app-api/core/undo.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { UndoCommandType } from '../../models/StoreModel/UndoStoreModel'

const mockSetUndoStack = vi.fn()
const mockSetRedoStack = vi.fn()
const mockUndoRedoStacks: Record<string, any> = {}

const mockSetNetworkModified = vi.fn()

vi.mock('../../data/hooks/stores/WorkspaceStore', () => ({
  useWorkspaceStore: {
    getState: vi.fn(() => ({
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
  })

  it('marks the network it is given, never the current one', async () => {
    const { markNetworkModified } = await coreUndoWithStackSize(20)

    markNetworkModified('net2')

    expect(mockSetNetworkModified).toHaveBeenCalledExactlyOnceWith('net2', true)
  })
})
