// src/app-api/core/undo.ts
// Framework-agnostic undo recording shared by app API core modules.
// Zero React imports; all store access via .getState().

import appConfig from '@/assets/config.json'

import { useUndoStore } from '../../data/hooks/stores/UndoStore'
import { useWorkspaceStore } from '../../data/hooks/stores/WorkspaceStore'
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
 * Marks a network as locally edited, so Save to NDEx offers it and Save
 * Workspace includes it.
 *
 * This is the single choke point for the flag. It is keyed on the network the
 * caller actually mutated, never on the focused network: the app API takes an
 * explicit networkId, and non-current networks stay resident in the stores
 * (NetworkStore evicts only on delete), so a write to one that is not on
 * screen must still mark that network and not the one the user is looking at.
 *
 * Returns without touching the store when the network is already marked. The
 * guard is not cosmetic: `workspaceImpl.setNetworkModified` rebuilds the
 * workspace object, so a redundant call changes its identity and re-renders
 * all ~16 components selecting `state.workspace` (NetworkPanel and every
 * summary row among them), and WorkspaceStore's persist middleware
 * JSON-stringifies the whole workspace twice to decide it need not write. This
 * runs on every recorded edit — a node drag posts one per mouse-up — so the
 * deleted WorkspaceEditor subscriptions guarded it the same way.
 */
export function markNetworkModified(networkId: IdType): void {
  const { workspace, setNetworkModified } = useWorkspaceStore.getState()
  // Optional-chained on purpose: `postEdit` calls this from click handlers
  // that do not catch, and it runs AFTER the store mutation it accompanies.
  // A throw here would leave the edit applied with no undo entry, so an
  // unexpectedly shaped workspace has to fall through to the write (which
  // rebuilds `networkModified` from scratch) rather than raise.
  if (workspace?.networkModified?.[networkId] === true) {
    return
  }
  setNetworkModified(networkId, true)
}

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
  // Before the stack write, not after: a deployment with undoStackSize: 0
  // disables undo but must still mark the network modified.
  markNetworkModified(networkId)

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
