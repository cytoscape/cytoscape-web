// src/app-api/core/undo.ts
// Framework-agnostic undo recording shared by app API core modules.
// Zero React imports; all store access via .getState().

import { useUndoStore } from '../../data/hooks/stores/UndoStore'
import { IdType } from '../../models/IdType'
import { UndoCommandType } from '../../models/StoreModel/UndoStoreModel'

const DEFAULT_UNDO_STACK_SIZE = 20

/**
 * Framework-agnostic postEdit — records an undo entry on the stack of the
 * network the operation actually mutated. Unlike the internal
 * useUndoStack.postEdit default (which targets the focused network), the
 * app API always receives an explicit networkId, so the entry must follow
 * it: undo stacks are per-network and an entry on the wrong stack would
 * replay the inverse operation against a network the user is not looking at.
 */
export function corePostEdit(
  networkId: IdType,
  undoCommand: UndoCommandType,
  description: string,
  undoParams: any[],
  redoParams: any[],
): void {
  const undoState = useUndoStore.getState()
  const stack = undoState.undoRedoStacks[networkId] ?? {
    undoStack: [],
    redoStack: [],
  }
  const newEdit = { undoCommand, description, undoParams, redoParams }
  const nextUndoStack = [...stack.undoStack, newEdit].slice(
    -DEFAULT_UNDO_STACK_SIZE,
  )
  undoState.setUndoStack(networkId, nextUndoStack)
  undoState.setRedoStack(networkId, [])
}
