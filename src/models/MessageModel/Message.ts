export const MessageSeverity = {
  SUCCESS: 'success',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
} as const

export type MessageSeverityType = (typeof MessageSeverity)[keyof typeof MessageSeverity]

export interface Message {
  message: string
  duration: number
  severity?: MessageSeverityType
}
