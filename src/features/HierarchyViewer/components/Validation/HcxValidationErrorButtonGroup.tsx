import PublishedWithChanges from '@mui/icons-material/PublishedWithChanges'
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import {
  Box,
  ButtonGroup,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material'
import { ReactElement, useState } from 'react'

import { useNetworkSummaryStore } from '../../../../data/hooks/stores/NetworkSummaryStore'
import { useTableStore } from '../../../../data/hooks/stores/TableStore'
import { IdType } from '../../../../models/IdType'
import { useHcxValidatorStore } from '../../store/HcxValidatorStore'
import { validateAndRecordHcx } from '../../utils/validateAndRecordHcx'
import { HcxValidationWarningsDialog } from './HcxValidationWarningsDialog'

export interface HcxValidationButtonGroupProps {
  id: IdType
}

export const HcxValidationButtonGroup = (
  props: HcxValidationButtonGroupProps,
): ReactElement => {
  const { id } = props
  const [showValidationResults, setShowValidationResults] =
    useState<boolean>(false)
  const [showValidationSuccess, setShowValidationSuccess] =
    useState<boolean>(false)
  const validationResults = useHcxValidatorStore(
    (state) => state.validationResults,
  )
  const validationResult = validationResults?.[id]

  const summary = useNetworkSummaryStore((state) => state.summaries[id])
  const table = useTableStore((state) => state.tables[id])
  const nodeTable = table?.nodeTable
  const edgeTable = table?.edgeTable

  const revalidateHcx = (): void => {
    const validationRes = validateAndRecordHcx(
      id,
      summary,
      nodeTable,
      edgeTable,
    )
    if (validationRes.isValid) {
      setShowValidationSuccess(true)
      setTimeout(() => {
        setShowValidationSuccess(false)
      }, 4000)
    }
  }

  if (validationResult === undefined) {
    return <Box></Box>
  }

  return (
    <Box>
      {showValidationSuccess ? (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <CheckCircleOutlineIcon color="success" sx={{ mr: 1 }} />
          <Typography variant="caption">
            Network successfully validated
          </Typography>
        </Box>
      ) : null}
      {!validationResult.isValid || validationResult.warnings.length > 0 ? (
        <ButtonGroup size="small" variant="outlined">
          <Tooltip
            title={
              validationResult.isValid
                ? 'This HCX network has warnings.  Click to see what they affect.'
                : 'This HCX network is not valid.  Click to learn how you can fix it.'
            }
          >
            <IconButton
              data-testid="hcx-validation-warnings-button"
              onClick={() => setShowValidationResults(true)}
            >
              <WarningAmberOutlined
                sx={{ width: 22, height: 22 }}
                color={validationResult.isValid ? 'warning' : 'error'}
              />
            </IconButton>
          </Tooltip>
          <Tooltip title="Revalidate HCX network">
            <IconButton
              data-testid="hcx-validation-revalidate-button"
              onClick={() => revalidateHcx()}
            >
              <PublishedWithChanges sx={{ width: 22, height: 22 }} />
            </IconButton>
          </Tooltip>
        </ButtonGroup>
      ) : null}
      <HcxValidationWarningsDialog
        open={showValidationResults}
        onClose={() => setShowValidationResults(false)}
        validationResult={validationResult}
      />
    </Box>
  )
}
