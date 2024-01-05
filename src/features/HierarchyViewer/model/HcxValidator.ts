import { NdexNetworkSummary } from '../../../models/NetworkSummaryModel'
import { Table } from '../../../models/TableModel'

import { HcxVersion } from './HcxVersion'

export interface HcxValidationResult {
  isValid: boolean
  warnings: string[]
  version: HcxVersion
}

export interface HcxValidator {
  version: HcxVersion
  validate: (
    summary: NdexNetworkSummary,
    nodeTable: Table,
  ) => HcxValidationResult
}
