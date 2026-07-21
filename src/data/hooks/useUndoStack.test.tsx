import { act, renderHook } from '@testing-library/react'
import { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppConfigContext, defaultAppConfig } from '../../AppConfigContext'
import { UndoCommandType } from '../../models/StoreModel/UndoStoreModel'
import { TableType } from '../../models/StoreModel/TableStoreModel'
import { createTable } from '../../models/TableModel/impl/inMemoryTable'
import { ValueTypeName } from '../../models/TableModel'
import { useTableStore } from './stores/TableStore'
import { useUiStateStore } from './stores/UiStateStore'
import { useUndoStore } from './stores/UndoStore'
import { useWorkspaceStore } from './stores/WorkspaceStore'
import { useUndoStack } from './useUndoStack'

// Mock the database module so store persistence does not hit IndexedDB
vi.mock('../db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../db')>()
  const mocked: Record<string, any> = { ...actual }
  for (const key of Object.keys(actual)) {
    if (
      key.startsWith('put') ||
      key.startsWith('delete') ||
      key.startsWith('clear')
    ) {
      mocked[key] = vi.fn().mockResolvedValue(undefined)
    }
  }
  return mocked
})

const NETWORK_ID = 'undo-net-1'

const makeWrapper = (undoStackSize: number) => {
  return ({ children }: { children: ReactNode }) => (
    <AppConfigContext.Provider value={{ ...defaultAppConfig, undoStackSize }}>
      {children}
    </AppConfigContext.Provider>
  )
}

const seedTable = (): void => {
  const nodeTable = createTable(`${NETWORK_ID}-nodes`, [
    { name: 'name', type: ValueTypeName.String },
  ])
  nodeTable.rows.set('n1', { name: 'original' })
  const edgeTable = createTable(`${NETWORK_ID}-edges`)
  useTableStore.getState().add(NETWORK_ID, nodeTable, edgeTable)
}

const cellEdit = (
  previousValue: string,
  nextValue: string,
): {
  undoCommand: UndoCommandType
  description: string
  undoParams: any[]
  redoParams: any[]
} => ({
  undoCommand: UndoCommandType.SET_CELL_VALUE,
  description: `set cell to ${nextValue}`,
  undoParams: [NETWORK_ID, TableType.NODE, 'n1', 'name', previousValue],
  redoParams: [NETWORK_ID, TableType.NODE, 'n1', 'name', nextValue],
})

describe('useUndoStack', () => {
  beforeEach(() => {
    act(() => {
      useUndoStore.getState().deleteAllStacks()
      useTableStore.getState().deleteAll()
      useWorkspaceStore.getState().setCurrentNetworkId(NETWORK_ID)
      useUiStateStore.getState().setActiveNetworkView('')
      seedTable()
    })
  })

  it('postEdit caps the undo stack at undoStackSize and clears the redo stack', () => {
    const { result } = renderHook(() => useUndoStack(), {
      wrapper: makeWrapper(3),
    })

    act(() => {
      useUndoStore
        .getState()
        .setRedoStack(NETWORK_ID, [cellEdit('x', 'y')])
      for (let i = 0; i < 5; i++) {
        result.current.postEdit(
          UndoCommandType.SET_CELL_VALUE,
          `edit ${i}`,
          [NETWORK_ID, TableType.NODE, 'n1', 'name', `v${i}`],
          [NETWORK_ID, TableType.NODE, 'n1', 'name', `v${i + 1}`],
        )
      }
    })

    const stacks = useUndoStore.getState().undoRedoStacks[NETWORK_ID]
    expect(stacks.undoStack).toHaveLength(3)
    expect(stacks.redoStack).toEqual([])
  })

  // REVIEW.md round-2 B10: `slice(-0)` returns the whole array, so a
  // config of 0 (disable undo) produced UNBOUNDED growth instead.
  it('undoStackSize 0 disables the stack instead of unbounding it (regression: B10)', () => {
    const { result } = renderHook(() => useUndoStack(), {
      wrapper: makeWrapper(0),
    })

    act(() => {
      result.current.postEdit(
        UndoCommandType.SET_CELL_VALUE,
        'edit',
        [NETWORK_ID, TableType.NODE, 'n1', 'name', 'a'],
        [NETWORK_ID, TableType.NODE, 'n1', 'name', 'b'],
      )
      result.current.postEdit(
        UndoCommandType.SET_CELL_VALUE,
        'edit 2',
        [NETWORK_ID, TableType.NODE, 'n1', 'name', 'b'],
        [NETWORK_ID, TableType.NODE, 'n1', 'name', 'c'],
      )
    })

    expect(
      useUndoStore.getState().undoRedoStacks[NETWORK_ID]?.undoStack ?? [],
    ).toHaveLength(0)
  })

  // REVIEW.md round-2 B5: a stack persisted by a different app version can
  // contain a command name this build does not know. That used to throw
  // `TypeError: undoCommand is not a function` AND leave the edit on the
  // stack, so every retry re-threw.
  it('discards an unknown persisted command instead of throwing (regression: B5)', () => {
    const { result } = renderHook(() => useUndoStack(), {
      wrapper: makeWrapper(10),
    })

    act(() => {
      useUndoStore.getState().setUndoStack(NETWORK_ID, [
        {
          undoCommand: 'COMMAND_FROM_THE_FUTURE' as UndoCommandType,
          description: 'unknown',
          undoParams: [],
          redoParams: [],
        },
      ])
    })

    expect(() => {
      act(() => {
        result.current.undoLastEdit()
      })
    }).not.toThrow()
    // The unusable edit is discarded so the stack is not wedged
    expect(
      useUndoStore.getState().undoRedoStacks[NETWORK_ID].undoStack,
    ).toHaveLength(0)
  })

  // REVIEW.md round-2 B5 (second half): a command that throws (e.g. its
  // network is gone) used to escape into the click handler and the edit
  // stayed on the stack forever.
  it('pops an edit whose command throws instead of wedging the stack (regression: B5)', () => {
    const { result } = renderHook(() => useUndoStack(), {
      wrapper: makeWrapper(10),
    })

    act(() => {
      useUndoStore.getState().setUndoStack(NETWORK_ID, [
        {
          undoCommand: UndoCommandType.CREATE_NODES,
          description: 'create on a network that no longer exists',
          undoParams: ['no-such-network', ['n1']],
          redoParams: ['no-such-network', ['n1']],
        },
      ])
    })

    expect(() => {
      act(() => {
        result.current.undoLastEdit()
      })
    }).not.toThrow()
    expect(
      useUndoStore.getState().undoRedoStacks[NETWORK_ID].undoStack,
    ).toHaveLength(0)
  })

  // REVIEW.md round-2 B4: undoLastEdit used render-captured stacks, so two
  // calls before a re-render undid the same edit twice.
  it('two undos in a single tick undo two distinct edits (regression: B4)', () => {
    const { result } = renderHook(() => useUndoStack(), {
      wrapper: makeWrapper(10),
    })

    act(() => {
      useTableStore
        .getState()
        .setValue(NETWORK_ID, TableType.NODE, 'n1', 'name', 'first')
      result.current.postEdit(
        UndoCommandType.SET_CELL_VALUE,
        'first edit',
        [NETWORK_ID, TableType.NODE, 'n1', 'name', 'original'],
        [NETWORK_ID, TableType.NODE, 'n1', 'name', 'first'],
      )
      useTableStore
        .getState()
        .setValue(NETWORK_ID, TableType.NODE, 'n1', 'name', 'second')
      result.current.postEdit(
        UndoCommandType.SET_CELL_VALUE,
        'second edit',
        [NETWORK_ID, TableType.NODE, 'n1', 'name', 'first'],
        [NETWORK_ID, TableType.NODE, 'n1', 'name', 'second'],
      )
    })

    act(() => {
      // Same tick: no re-render between the two calls
      result.current.undoLastEdit()
      result.current.undoLastEdit()
    })

    const stacks = useUndoStore.getState().undoRedoStacks[NETWORK_ID]
    expect(stacks.undoStack).toHaveLength(0)
    expect(stacks.redoStack).toHaveLength(2)
    expect(
      useTableStore
        .getState()
        .tables[NETWORK_ID].nodeTable.rows.get('n1')?.name,
    ).toBe('original')
  })

  // REVIEW.md round-2 B6: clearStack was literally `() => {}`.
  it('clearStack actually clears the stacks (regression: B6)', () => {
    const { result } = renderHook(() => useUndoStack(), {
      wrapper: makeWrapper(10),
    })

    act(() => {
      result.current.postEdit(
        UndoCommandType.SET_CELL_VALUE,
        'edit',
        [NETWORK_ID, TableType.NODE, 'n1', 'name', 'a'],
        [NETWORK_ID, TableType.NODE, 'n1', 'name', 'b'],
      )
    })
    expect(
      useUndoStore.getState().undoRedoStacks[NETWORK_ID].undoStack,
    ).toHaveLength(1)

    act(() => {
      result.current.clearStack()
    })

    expect(
      useUndoStore.getState().undoRedoStacks[NETWORK_ID],
    ).toBeUndefined()
  })
})
