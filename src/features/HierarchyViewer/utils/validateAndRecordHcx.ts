import { useMessageStore } from '../../../data/hooks/stores/MessageStore'
import { IdType } from '../../../models/IdType'
import { MessageSeverity } from '../../../models/MessageModel'
import { NetworkSummary } from '../../../models/NetworkSummaryModel'
import { Table } from '../../../models/TableModel'
import { HcxMetaTag } from '../model/HcxMetaTag'
import { HcxValidationResult } from '../model/HcxValidator'
import { validateHcx } from '../model/impl/hcxValidators'
import { useHcxValidatorStore } from '../store/HcxValidatorStore'

export const INVALID_HCX_MESSAGE =
  'This network is not a valid HCX network. Some features may not work properly.'

export const INVALID_HCX_WARNING_DURATION_MS = 5000

/**
 * Validate an HCX network, record the result in the HcxValidatorStore and, if
 * it is invalid, post the one "not a valid HCX network" warning.
 *
 * The single place that warning is emitted: network registration, loading a
 * network into the workspace, and the manual re-validate button all go
 * through here, so the wording and duration cannot drift apart.
 *
 * Callers decide whether the network is HCX at all (see `isHCX`).
 */
export const validateAndRecordHcx = (
  networkId: IdType,
  summary: NetworkSummary,
  nodeTable: Table,
  edgeTable?: Table,
): HcxValidationResult => {
  const version =
    summary?.properties?.find(
      (p) => p.predicateString === HcxMetaTag.ndexSchema,
    )?.value ?? ''
  const validationResult = validateHcx(
    version as string,
    summary,
    nodeTable,
    edgeTable,
  )

  if (!validationResult.isValid) {
    useMessageStore.getState().addMessage({
      message: INVALID_HCX_MESSAGE,
      duration: INVALID_HCX_WARNING_DURATION_MS,
      severity: MessageSeverity.WARNING,
    })
  }
  useHcxValidatorStore
    .getState()
    .setValidationResult(networkId, validationResult)

  return validationResult
}
