export const MessageSeverity = {
  SUCCESS: 'success',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
} as const

export type MessageSeverityType =
  (typeof MessageSeverity)[keyof typeof MessageSeverity]

export interface Message {
  message: string
  duration?: number
  /**
   * When true, the message remains visible until the user dismisses it.
   */
  persistent?: boolean
  severity?: MessageSeverityType
}
