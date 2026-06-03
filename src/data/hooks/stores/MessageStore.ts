/**
 * @deprecated The Module Federation exposure of this store (cyweb/MessageStore) is deprecated for external apps.
 * This store is still actively used internally by the host application — it is NOT being removed.
 * External apps should use the App API (e.g., `cyweb/NetworkApi`) instead of importing this store directly.
 * This cyweb/MessageStore Module Federation export will be removed after 2 release cycles.
 */
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { Message } from '../../../models/MessageModel'
import { MessageStore } from '../../../models/StoreModel/MessageStoreModel'

export const useMessageStore = create(
  immer<MessageStore>((set) => ({
    messages: [],
    addMessage: (message: Message) => {
      set((state) => {
        state.messages.push(message)
      })
    },
    resetMessages: () => {
      set((state) => {
        state.messages = []
      })
    },
  })),
)
