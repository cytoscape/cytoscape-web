import { IdType } from '../IdType'

export interface NetworkSummary {
  id: IdType
  modifiedAt: Date
  name?: string
  url?: string
}
