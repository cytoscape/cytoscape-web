import { ReactElement, useState } from 'react'
import {
  Tooltip,
  IconButton,
  Box,
  Theme,
  Typography,
  Divider,
  Dialog,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  DialogActions,
  ButtonGroup,
} from '@mui/material'
import { blueGrey } from '@mui/material/colors'
import { useTheme } from '@mui/material/styles'
import EditIcon from '@mui/icons-material/Edit'
import CircleIcon from '@mui/icons-material/Circle'

import { IdType } from '../../models/IdType'
import { NdexNetworkSummary } from '../../models/NetworkSummaryModel'
import { useWorkspaceStore } from '../../store/WorkspaceStore'
import { useViewModelStore } from '../../store/ViewModelStore'
import { useHcxValidatorStore } from '../../features/HierarchyViewer/store/HcxValidatorStore'
import { PublishedWithChanges, WarningAmberOutlined } from '@mui/icons-material'
import { HcxMetaTag } from '../../features/HierarchyViewer/model/HcxMetaTag'
import { validateHcx } from '../../features/HierarchyViewer/model/impl/hcxValidators'
import { useTableStore } from '../../store/TableStore'
import { useMessageStore } from '../../store/MessageStore'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import { NetworkPropertyEditor } from './NdexNetworkPropertyEditor'

interface NetworkPropertyPanelProps {
  summary: NdexNetworkSummary
}

export const NetworkPropertyPanel = ({
  summary,
}: NetworkPropertyPanelProps): ReactElement => {
  const theme: Theme = useTheme()
  const { nodeCount, edgeCount } = summary

  // Need to use ID from the summary since it is different from the currentNetworkId
  const id: IdType = summary.externalId

  const [editNetworkSummaryAnchorEl, setEditNetworkSummaryAnchorEl] = useState<
    HTMLButtonElement | undefined
  >(undefined)

  const table = useTableStore((state) => state.tables[id])
  const nodeTable = table?.nodeTable

  const [showValidationResults, setShowValidationResults] =
    useState<boolean>(false)

  const setValidationResult = useHcxValidatorStore(
    (state) => state.setValidationResult,
  )
  const addMessage = useMessageStore((state) => state.addMessage)
  const [showValidationSuccess, setShowValidationSuccess] =
    useState<boolean>(false)

  const revalidateHcx = (): void => {
    const version =
      summary.properties.find(
        (p) => p.predicateString === HcxMetaTag.ndexSchema,
      )?.value ?? ''
    const validationRes = validateHcx(version as string, summary, nodeTable)

    if (!validationRes.isValid) {
      addMessage({
        message: `This network is not a valid HCX network.  Some features may not work properly.`,
        duration: 10000,
      })
    } else {
      setShowValidationSuccess(true)
      setTimeout(() => {
        setShowValidationSuccess(false)
      }, 4000)
    }
    setValidationResult(id, validationRes)
  }

  const hideEditNetworkSummaryForm = (event: any): void => {
    event.stopPropagation()
    setEditNetworkSummaryAnchorEl(undefined)
  }

  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const networkViewModel = useViewModelStore((state) => state.viewModels[id])

  const showEditNetworkSummaryForm = (
    event: React.MouseEvent<HTMLButtonElement>,
  ): void => {
    event.stopPropagation()

    setEditNetworkSummaryAnchorEl(event.currentTarget)
  }

  const setCurrentNetworkId: (id: IdType) => void = useWorkspaceStore(
    (state) => state.setCurrentNetworkId,
  )

  const networkModified =
    useWorkspaceStore((state) => state.workspace.networkModified[id]) ?? false

  const backgroundColor: string =
    currentNetworkId === id ? blueGrey[100] : '#FFFFFF'

  const networkModifiedIcon = networkModified ? (
    <Tooltip title="Network has been modified">
      <CircleIcon sx={{ color: theme.palette.error.main, fontSize: 10 }} />
    </Tooltip>
  ) : null

  const validationResults = useHcxValidatorStore(
    (state) => state.validationResults,
  )
  const validationResult = validationResults?.[id]

  return (
    <>
      <Divider />
      <Box
        sx={{
          backgroundColor,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          '&:hover': { cursor: 'pointer' },
          p: 1,
        }}
        onClick={() => {
          setCurrentNetworkId(id)
        }}
      >
        <Box sx={{ width: '100%' }}>
          <Typography
            variant={'body2'}
            sx={{ width: '100%', display: 'flex', alignItems: 'center' }}
          >
            {summary.name}
            {networkModifiedIcon}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography
              variant={'subtitle2'}
              sx={{ width: '100%', color: theme.palette.text.secondary }}
            >
              {`N: ${nodeCount} (${
                networkViewModel?.selectedNodes.length ?? 0
              }) /
          E: ${edgeCount} (${networkViewModel?.selectedEdges.length ?? 0})`}
            </Typography>

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
            {showValidationSuccess ? (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircleOutlineIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="caption">
                  Network successfully validated
                </Typography>
              </Box>
            ) : null}
          </Box>
        </Box>
        <Tooltip title="Edit network properties">
          <IconButton
            size="small"
            sx={{ width: 30, height: 30 }}
            onClick={(e) => {
              setCurrentNetworkId(id)
              showEditNetworkSummaryForm(e)
            }}
          >
            <EditIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        <Dialog open={showValidationResults}>
          <DialogTitle>Invalid HCX Network</DialogTitle>
          <DialogContent>
            <DialogContentText>
              {`This network is flagged as a hierarchical network(HCX), but it does not pass all conditions required to be considered valid.  The following problems were found in your HCX network. Please
              review the HCX specification for version '${
                validationResult?.version as string
              }' for more details.`}
              <ul>
                {validationResult?.warnings.map((w, i) => (
                  <li key={i}>
                    <Typography color="warning" key={i}>
                      {w}
                    </Typography>
                  </li>
                ))}
              </ul>
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowValidationResults(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>

        <NetworkPropertyEditor
          anchorEl={editNetworkSummaryAnchorEl}
          summary={summary}
          onClose={hideEditNetworkSummaryForm}
        />
      </Box>
    </>
  )
}
