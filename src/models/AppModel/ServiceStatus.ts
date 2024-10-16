export const ServiceStatus = {
  Submitted: 'submitted',
  Processing: 'processing',
  Complete: 'complete',
  Failed: 'failed',
} as const

export type ServiceStatus = (typeof ServiceStatus)[keyof typeof ServiceStatus]
