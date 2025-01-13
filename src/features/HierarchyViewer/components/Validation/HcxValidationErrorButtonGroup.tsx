import { ReactElement, useState } from 'react'
import { useHcxValidatorStore } from '../../store/HcxValidatorStore'
import { IdType } from '../../../../models/IdType'
import {
  Box,
  ButtonGroup,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'

import { useNetworkSummaryStore } from '../../../../store/NetworkSummaryStore'
import { WarningAmberOutlined, PublishedWithChanges } from '@mui/icons-material'
import { HcxMetaTag } from '../../model/HcxMetaTag'
import { validateHcx } from '../../model/impl/hcxValidators'
import { useTableStore } from '../../../../store/TableStore'
import { useMessageStore } from '../../../../store/MessageStore'
import { HcxValidationWarningsDialog } from './HcxValidationWarningsDialog'
import { MessageSeverity } from '../../../../models'

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
  const setValidationResult = useHcxValidatorStore(
    (state) => state.setValidationResult,
  )
  const addMessage = useMessageStore((state) => state.addMessage)

  const summary = useNetworkSummaryStore((state) => state.summaries[id])
  const table = useTableStore((state) => state.tables[id])
  const nodeTable = table?.nodeTable

  const revalidateHcx = (): void => {
    const version =
      summary?.properties?.find(
        (p) => p.predicateString === HcxMetaTag.ndexSchema,
      )?.value ?? ''
    const validationRes = validateHcx(version as string, summary, nodeTable)

    if (!validationRes.isValid) {
      addMessage({
        message: `This network is not a valid HCX network.  Some features may not work properly.`,
        duration: 5000,
        severity: MessageSeverity.WARNING,
      })
    } else {
      setShowValidationSuccess(true)
      setTimeout(() => {
        setShowValidationSuccess(false)
      }, 4000)
    }
    setValidationResult(id, validationRes)
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
      {validationResult !== undefined && !validationResult.isValid ? (
        <ButtonGroup size="small" variant="outlined">
          <Tooltip title="This HCX network is not valid.  Click to learn how you can fix it.">
            <IconButton onClick={() => setShowValidationResults(true)}>
              <WarningAmberOutlined
                sx={{ width: 22, height: 22 }}
                color="error"
              />
            </IconButton>
          </Tooltip>
          <Tooltip title="Revalidate HCX network">
            <IconButton onClick={() => revalidateHcx()}>
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
