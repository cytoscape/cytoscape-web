import { IdType } from '../IdType'
import { StyleTemplate, VisualStyle } from '../VisualStyleModel'

/**
 * Workspace-level library of reusable visual style templates.
 *
 * Templates are independent of any network: applying one COPIES its content
 * into the target network's style set (copy-on-assign), so there are no
 * live references to break or reconcile. The library is persisted in
 * IndexedDB only — it never travels inside a network's CX2 document.
 */
export interface StyleLibraryState {
  templates: Record<IdType, StyleTemplate>
  /** True once the library has been loaded from IndexedDB. */
  initialized: boolean
}

export interface StyleLibraryAction {
  /** Load all templates from IndexedDB (idempotent). */
  hydrate: () => Promise<void>
  /**
   * Save a style to the library. The content is deep-copied and all
   * bypasses are stripped (bypass entries reference element ids of a
   * specific network). Returns the new template id.
   */
  addTemplate: (name: string, visualStyle: VisualStyle) => IdType
  renameTemplate: (id: IdType, name: string) => void
  deleteTemplate: (id: IdType) => void
  deleteAllTemplates: () => void
}

export type StyleLibraryStore = StyleLibraryState & StyleLibraryAction
