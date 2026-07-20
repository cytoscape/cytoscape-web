import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  Edit,
  UndoCommandType,
  UndoRedoStack,
} from '../../../models/StoreModel/UndoStoreModel'
import { putUndoRedoStackToDb } from '../../db'
import { useUndoStore } from './UndoStore'

// Mock the database operations to avoid IndexedDB issues in tests
vi.mock('../../db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../db')>()
  return {
    ...actual,
    putUndoRedoStackToDb: vi.fn().mockResolvedValue(undefined),
  }
})

// Mock the workspace store to provide a controllable current network ID
const workspaceMock = vi.hoisted(() => ({
  currentNetworkId: 'net-current',
}))

vi.mock('./WorkspaceStore', () => ({
  useWorkspaceStore: {
    getState: vi.fn(() => ({
      workspace: {
        currentNetworkId: workspaceMock.currentNetworkId,
      },
    })),
  },
}))

const createEdit = (description: string): Edit => ({
  undoCommand: UndoCommandType.SET_CELL_VALUE,
  description,
  undoParams: ['net-current', 'node', 'n1', 'name', 'old'],
  redoParams: ['net-current', 'node', 'n1', 'name', 'new'],
})

const createStack = (edits: Edit[] = []): UndoRedoStack => ({
  undoStack: edits,
  redoStack: [],
})

// Flush the async persist wrapper (it awaits the DB put after set())
const flushPersist = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve()
  })
}

describe('useUndoStore', () => {
  beforeEach(async () => {
    workspaceMock.currentNetworkId = 'net-current'
    const { result } = renderHook(() => useUndoStore())
    act(() => {
      result.current.deleteAllStacks()
    })
    await flushPersist()
    vi.mocked(putUndoRedoStackToDb).mockClear()
  })

  describe('state operations', () => {
    it('addStack stores a stack for a network', async () => {
      const { result } = renderHook(() => useUndoStore())
      const stack = createStack([createEdit('edit-1')])

      act(() => {
        result.current.addStack('net-a', stack)
      })
      await flushPersist()

      expect(result.current.undoRedoStacks['net-a']).toEqual(stack)
    })

    it('setUndoStack creates the stack if it does not exist', async () => {
      const { result } = renderHook(() => useUndoStore())
      const edits = [createEdit('edit-1')]

      act(() => {
        result.current.setUndoStack('net-a', edits)
      })
      await flushPersist()

      expect(result.current.undoRedoStacks['net-a']).toEqual({
        undoStack: edits,
        redoStack: [],
      })
    })

    it('setRedoStack creates the stack if it does not exist', async () => {
      const { result } = renderHook(() => useUndoStore())
      const edits = [createEdit('edit-1')]

      act(() => {
        result.current.setRedoStack('net-a', edits)
      })
      await flushPersist()

      expect(result.current.undoRedoStacks['net-a']).toEqual({
        undoStack: [],
        redoStack: edits,
      })
    })

    it('setUndoStack replaces the undo stack without touching the redo stack', async () => {
      const { result } = renderHook(() => useUndoStore())
      const redoEdits = [createEdit('redo-1')]

      act(() => {
        result.current.setRedoStack('net-a', redoEdits)
        result.current.setUndoStack('net-a', [createEdit('undo-1')])
      })
      await flushPersist()

      expect(result.current.undoRedoStacks['net-a'].redoStack).toEqual(
        redoEdits,
      )
      expect(result.current.undoRedoStacks['net-a'].undoStack).toHaveLength(1)
    })

    it('deleteStack removes only the given network stack', async () => {
      const { result } = renderHook(() => useUndoStore())

      act(() => {
        result.current.addStack('net-a', createStack())
        result.current.addStack('net-b', createStack())
        result.current.deleteStack('net-a')
      })
      await flushPersist()

      expect(result.current.undoRedoStacks['net-a']).toBeUndefined()
      expect(result.current.undoRedoStacks['net-b']).toBeDefined()
    })

    it('deleteAllStacks clears everything', async () => {
      const { result } = renderHook(() => useUndoStore())

      act(() => {
        result.current.addStack('net-a', createStack())
        result.current.addStack('net-b', createStack())
        result.current.deleteAllStacks()
      })
      await flushPersist()

      expect(result.current.undoRedoStacks).toEqual({})
    })
  })

  describe('persistence (pins current behavior — see REVIEW.md)', () => {
    it('persists the current network stack when the mutated network IS current', async () => {
      const { result } = renderHook(() => useUndoStore())
      const edits = [createEdit('edit-1')]

      act(() => {
        result.current.setUndoStack('net-current', edits)
      })
      await flushPersist()

      expect(putUndoRedoStackToDb).toHaveBeenCalledWith(
        'net-current',
        expect.objectContaining({ undoStack: edits }),
      )
    })

    // REVIEW.md: the persist wrapper keys the DB write off
    // workspace.currentNetworkId, NOT off the network the action mutated.
    // These two tests pin that behavior so a fix is observable; when the
    // wrapper is fixed to persist the mutated slice, they should be updated.
    it('mutating a NON-current network persists the current network slice instead (known defect)', async () => {
      const { result } = renderHook(() => useUndoStore())

      act(() => {
        result.current.addStack('net-current', createStack())
      })
      await flushPersist()
      vi.mocked(putUndoRedoStackToDb).mockClear()

      act(() => {
        result.current.setUndoStack('net-other', [createEdit('other-edit')])
      })
      await flushPersist()

      // The write is keyed to net-current; net-other's stack never reaches DB
      expect(putUndoRedoStackToDb).toHaveBeenCalledWith(
        'net-current',
        expect.objectContaining({ undoStack: [] }),
      )
      expect(putUndoRedoStackToDb).not.toHaveBeenCalledWith(
        'net-other',
        expect.anything(),
      )
    })

    it('skips persistence entirely when the current network has no stack (known defect)', async () => {
      const { result } = renderHook(() => useUndoStore())
      workspaceMock.currentNetworkId = 'net-without-stack'

      act(() => {
        result.current.setUndoStack('net-other', [createEdit('other-edit')])
      })
      await flushPersist()

      expect(putUndoRedoStackToDb).not.toHaveBeenCalled()
    })

    it('deleteStack of the current network does not write to DB (stale row remains — known defect)', async () => {
      const { result } = renderHook(() => useUndoStore())

      act(() => {
        result.current.addStack('net-current', createStack([createEdit('e')]))
      })
      await flushPersist()
      vi.mocked(putUndoRedoStackToDb).mockClear()

      act(() => {
        result.current.deleteStack('net-current')
      })
      await flushPersist()

      // No put (slice is gone) and no delete call exists in the store at all:
      // the row for net-current stays in IndexedDB until overwritten.
      expect(putUndoRedoStackToDb).not.toHaveBeenCalled()
    })

    it('persists a plain object, not an Immer proxy', async () => {
      const { result } = renderHook(() => useUndoStore())

      act(() => {
        result.current.setUndoStack('net-current', [createEdit('edit-1')])
      })
      await flushPersist()

      const persisted = vi.mocked(putUndoRedoStackToDb).mock.calls.at(-1)?.[1]
      expect(persisted).toBeDefined()
      // structuredClone output: mutating it must not affect store state
      persisted.undoStack.push(createEdit('mutation'))
      expect(
        result.current.undoRedoStacks['net-current'].undoStack,
      ).toHaveLength(1)
    })
  })
})
