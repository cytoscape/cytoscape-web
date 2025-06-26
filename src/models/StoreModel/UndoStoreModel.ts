import { IdType } from '../IdType'

export const UndoCommandType = {
  SET_NETWORK_SUMMARY: 'SET_NETWORK_SUMMARY',
  SET_CELL_VALUE: 'SET_CELL_VALUE',
  APPLY_VALUE_TO_COLUMN: 'APPLY_VALUE_TO_COLUMN',
  APPLY_VALUE_TO_SELECTED: 'APPLY_VALUE_TO_SELECTED',
  SET_DEFAULT_VP_VALUE: 'SET_DEFAULT_VP_VALUE',
  CREATE_MAPPING: 'CREATE_MAPPING',
  REMOVE_MAPPING: 'REMOVE_MAPPING',
  SET_MAPPING_TYPE: 'SET_MAPPING_TYPE',
  SET_DISCRETE_VALUE: 'SET_DISCRETE_VALUE',
  DELETE_DISCRETE_VALUE: 'DELETE_DISCRETE_VALUE',
  SET_DISCRETE_VALUE_MAP: 'SET_DISCRETE_VALUE_MAP',
  DELETE_DISCRETE_VALUE_MAP: 'DELETE_DISCRETE_VALUE_MAP',
  SET_MAPPING_COLUMN: 'SET_MAPPING_COLUMN',
  SET_BYPASS: 'SET_BYPASS',
  SET_BYPASS_MAP: 'SET_BYPASS_MAP',
  DELETE_BYPASS: 'DELETE_BYPASS',
  DELETE_BYPASS_MAP: 'DELETE_BYPASS_MAP',
  RENAME_COLUMN: 'RENAME_COLUMN',
  DELETE_COLUMN: 'DELETE_COLUMN',
  MOVE_NODES: 'MOVE_NODES',
  APPLY_LAYOUT: 'APPLY_LAYOUT',
  DELETE_NODES: 'DELETE_NODES',
  DELETE_EDGES: 'DELETE_EDGES',
} as const

export type UndoCommandType =
  (typeof UndoCommandType)[keyof typeof UndoCommandType]

export interface Edit {
  undoCommand: UndoCommandType
  description: string
  undoParams: any[]
  redoParams: any[]
}

export interface UndoRedoStack {
  undoStack: Edit[]
  redoStack: Edit[]
}

export interface UndoRedoStackState {
  undoRedoStacks: Record<IdType, UndoRedoStack>
}

export interface UndoAction {
  addStack: (networkId: IdType, undoRedoStack: UndoRedoStack) => void
  setUndoStack: (networkId: IdType, undoStack: Edit[]) => void
  setRedoStack: (networkId: IdType, redoStack: Edit[]) => void
}

export type UndoStore = UndoRedoStackState & UndoAction
