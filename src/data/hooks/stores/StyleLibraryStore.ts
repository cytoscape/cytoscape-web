import { current } from 'immer'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { logStore } from '../../../debug'
import { IdType } from '../../../models/IdType'
import { StyleLibraryStore } from '../../../models/StoreModel/StyleLibraryStoreModel'
import { StyleTemplate, VisualStyle } from '../../../models/VisualStyleModel'
import {
  createStyleId,
  stripBypasses,
  uniqueStyleName,
} from '../../../models/VisualStyleModel/impl/visualStyleSetImpl'
import {
  clearStyleLibraryFromDb,
  deleteStyleTemplateFromDb,
  getAllStyleTemplatesFromDb,
  putStyleTemplateToDb,
} from '../../db'

/**
 * Workspace-level visual style template library.
 *
 * Persistence model: every mutation writes through to the `cyStyleLibrary`
 * IndexedDB table immediately; `hydrate()` loads the table once on first
 * use (e.g. when the library UI opens).
 */
/**
 * Log prefix. A literal, not `useStyleLibraryStore.name`: that reads the name
 * of the value `create()` returns, which is not this identifier and is empty
 * under minification.
 */
const STORE_LABEL = 'StyleLibraryStore'

export const useStyleLibraryStore = create(
  immer<StyleLibraryStore>((set, get) => ({
    templates: {},
    initialized: false,

    hydrate: async () => {
      if (get().initialized) {
        return
      }
      try {
        const templates: StyleTemplate[] = await getAllStyleTemplatesFromDb()
        set((state) => {
          // A concurrent hydrate may have won the race; last write is fine
          // because both read the same table.
          state.templates = Object.fromEntries(
            templates.map((template) => [template.id, template]),
          )
          state.initialized = true
          return state
        })
      } catch (e) {
        logStore.error(
          `[${STORE_LABEL}]: Failed to hydrate style library: ${e}`,
        )
      }
    },

    addTemplate: (name: string, visualStyle: VisualStyle): IdType => {
      const id = createStyleId()
      let created: StyleTemplate | undefined
      set((state) => {
        const existingNames = Object.values(state.templates).map(
          (template) => template.name,
        )
        created = {
          id,
          name: uniqueStyleName(name, existingNames),
          // stripBypasses also deep-copies, so the template can never be
          // mutated through the source style (or vice versa)
          visualStyle: stripBypasses(visualStyle),
        }
        state.templates[id] = created
        return state
      })
      // Outside the recipe: an Immer producer must be pure, and a write issued
      // from inside one runs before the draft is finalized.
      if (created !== undefined) {
        void putStyleTemplateToDb(created).catch((e) => {
          logStore.error(
            `[${STORE_LABEL}]: Failed to persist template ${id}: ${e}`,
          )
        })
      }
      return id
    },

    renameTemplate: (id: IdType, name: string) => {
      let persisted: StyleTemplate | undefined
      set((state) => {
        const entry = state.templates[id]
        if (entry === undefined) {
          logStore.warn(
            `[${STORE_LABEL}]: Cannot rename unknown template ${id}`,
          )
          return state
        }
        const siblingNames = Object.values(state.templates)
          .filter((template) => template.id !== id)
          .map((template) => template.name)
        const renamed: StyleTemplate = {
          ...current(entry),
          name: uniqueStyleName(name, siblingNames),
        }
        state.templates[id] = renamed
        persisted = renamed
        return state
      })
      if (persisted !== undefined) {
        void putStyleTemplateToDb(persisted).catch((e) => {
          logStore.error(
            `[${STORE_LABEL}]: Failed to persist template ${id}: ${e}`,
          )
        })
      }
    },

    deleteTemplate: (id: IdType) => {
      set((state) => {
        delete state.templates[id]
        return state
      })
      void deleteStyleTemplateFromDb(id).catch((e) => {
        logStore.error(
          `[${STORE_LABEL}]: Failed to delete template ${id}: ${e}`,
        )
      })
    },

    deleteAllTemplates: () => {
      set((state) => {
        state.templates = {}
        return state
      })
      void clearStyleLibraryFromDb().catch((e) => {
        logStore.error(`[${STORE_LABEL}]: Failed to clear style library: ${e}`)
      })
    },
  })),
)
