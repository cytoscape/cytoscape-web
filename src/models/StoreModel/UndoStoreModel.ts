export interface UndoState {
  undoStack: Edit[]
  redoStack: Edit[]
}

export interface UndoAction {
  setUndoStack: (undoStack: Edit[]) => void
  setRedoStack: (redoStack: Edit[]) => void
}

export type UndoStore = UndoState & UndoAction

export interface Edit {
  undoCommand: UndoCommandType
  params: any[]
}

export const UndoCommandType = {
  SET_DEFAULT_VP_VALUE: 'SET_DEFAULT_VP_VALUE',
  SET_MAPPING_TYPE: 'SET_MAPPING_TYPE',
  SET_DISCRETE_VALUE: 'SET_DISCRETE_VALUE',
  SET_DISCRETE_VALUE_MAP: 'SET_DISCRETE_VALUE_MAP',
  SET_MAPPING_COLUMN: 'SET_MAPPING_COLUMN',
  SET_BYPASS: 'SET_BYPASS',
  SET_BYPASS_MAP: 'SET_BYPASS_MAP',
  REMOVE_MAPPING: 'REMOVE_MAPPING',
  RENAME_COLUMN: 'RENAME_COLUMN',
  DELETE_COLUMN: 'DELETE_COLUMN',
  MOVE_NODES: 'MOVE_NODES',
  APPLY_LAYOUT: 'APPLY_LAYOUT',
  SET_LAYOUT_SCALE: 'SET_LAYOUT_SCALE',
  DELETE_NODES: 'DELETE_NODES',
  DELETE_EDGES: 'DELETE_EDGES',
  FIT_CONTENT: 'FIT_CONTENT',
} as const

export type UndoCommandType =
  (typeof UndoCommandType)[keyof typeof UndoCommandType]
