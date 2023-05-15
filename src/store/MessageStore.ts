import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { Message } from '../models/Message'

interface MessageState {
  messages: Message[]
}

interface MessageAction {
  addMessage: (message: Message) => void
}

type MessageStore = MessageState & MessageAction

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
