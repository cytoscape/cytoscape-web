import { IdType } from '../IdType'

export interface NetworkSummary {
  id: IdType
  name?: string
  url?: string
  modifiedAt: Date
  createdAt: Date
}
