import { Message } from '../MessageModel'

export interface MessageState {
  messages: Message[]
}

export interface MessageAction {
  addMessage: (message: Message) => void
  resetMessages: () => void 
}

export type MessageStore = MessageState & MessageAction
