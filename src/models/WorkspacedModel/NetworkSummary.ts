import { IdType } from '../IdType'

export interface NetworkSummary {
  id: IdType
  name?: string
  url?: string
  lastUpdate: Date
}
