import { NetworkSummary } from '../../../models/NetworkSummaryModel'
import { Table } from '../../../models/TableModel'

import { HcxVersion } from './HcxVersion'

export interface HcxValidationResult {
  isValid: boolean
  warnings: string[]
  version: HcxVersion
}

export interface HcxValidator {
  version: HcxVersion
  validate: (summary: NetworkSummary, nodeTable: Table) => HcxValidationResult
}
