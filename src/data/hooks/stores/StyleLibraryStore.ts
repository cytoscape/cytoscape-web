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
          `[${useStyleLibraryStore.name}]: Failed to hydrate style library: ${e}`,
        )
      }
    },

    addTemplate: (name: string, visualStyle: VisualStyle): IdType => {
      const id = createStyleId()
      set((state) => {
        const existingNames = Object.values(state.templates).map(
          (template) => template.name,
        )
        const template: StyleTemplate = {
          id,
          name: uniqueStyleName(name, existingNames),
          // stripBypasses also deep-copies, so the template can never be
          // mutated through the source style (or vice versa)
          visualStyle: stripBypasses(visualStyle),
        }
        state.templates[id] = template
        void putStyleTemplateToDb(template).catch((e) => {
          logStore.error(
            `[${useStyleLibraryStore.name}]: Failed to persist template ${id}: ${e}`,
          )
        })
        return state
      })
      return id
    },

    renameTemplate: (id: IdType, name: string) => {
      set((state) => {
        const entry = state.templates[id]
        if (entry === undefined) {
          logStore.warn(
            `[${useStyleLibraryStore.name}]: Cannot rename unknown template ${id}`,
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
        void putStyleTemplateToDb(renamed).catch((e) => {
          logStore.error(
            `[${useStyleLibraryStore.name}]: Failed to persist template ${id}: ${e}`,
          )
        })
        return state
      })
    },

    deleteTemplate: (id: IdType) => {
      set((state) => {
        delete state.templates[id]
        void deleteStyleTemplateFromDb(id).catch((e) => {
          logStore.error(
            `[${useStyleLibraryStore.name}]: Failed to delete template ${id}: ${e}`,
          )
        })
        return state
      })
    },

    deleteAllTemplates: () => {
      set((state) => {
        state.templates = {}
        void clearStyleLibraryFromDb().catch((e) => {
          logStore.error(
            `[${useStyleLibraryStore.name}]: Failed to clear style library: ${e}`,
          )
        })
        return state
      })
    },
  })),
)
