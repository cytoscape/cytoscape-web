// src/app-api/core/undo.ts
// Framework-agnostic undo recording shared by app API core modules.
// Zero React imports; all store access via .getState().

import appConfig from '@/assets/config.json'

import { useUndoStore } from '../../data/hooks/stores/UndoStore'
import { IdType } from '../../models/IdType'
import { UndoCommandType } from '../../models/StoreModel/UndoStoreModel'

/**
 * The same bound `useUndoStack` applies, read from the config file that
 * hydrates AppConfigContext rather than from the context itself (this
 * module is React-free, like the other non-React config consumers —
 * keycloak, googleAnalytics). A deployment that raises the limit, or
 * disables undo with 0, now governs app API edits too instead of only the
 * in-app ones.
 */
const UNDO_STACK_SIZE: number = appConfig.undoStackSize

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
  // slice(-0) === slice(0), so a size of 0 must be handled explicitly: it
  // disables undo rather than unbounding the stack (matches useUndoStack)
  const nextUndoStack =
    UNDO_STACK_SIZE > 0
      ? [...stack.undoStack, newEdit].slice(-UNDO_STACK_SIZE)
      : []
  undoState.setUndoStack(networkId, nextUndoStack)
  undoState.setRedoStack(networkId, [])
}
