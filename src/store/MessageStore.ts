import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { Message } from '../models/MessageModel'
import { MessageStore } from '../models/StoreModel/MessageStoreModel'

export const useMessageStore = create(
  immer<MessageStore>((set) => ({
    messages: [],
    addMessage: (message: Message) => {
      set((state) => {
        state.messages.push(message)
      })
    },
  })),
)
