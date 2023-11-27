import {
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  FormControl,
  InputLabel,
  Select,
  TextField,
  DialogActions,
  Button,
  Tooltip,
  Box,
} from '@mui/material'
import { ReactElement, useState } from 'react'
import { BaseMenuProps } from '../../../components/ToolBar/BaseMenuProps'
import { IdType } from '../../../models/IdType'
import { useNetworkSummaryStore } from '../../../store/NetworkSummaryStore'
import { useWorkspaceStore } from '../../../store/WorkspaceStore'
import { isHCX } from '../../HierarchyViewer/utils/hierarcy-util'
import { LLMModel, models } from '../model/LLMModel'
import { useLLMQueryStore } from '../store'

export const LLMQueryOptionsMenuItem = (props: BaseMenuProps): ReactElement => {
  const loading = useLLMQueryStore((state) => state.loading)
  const setLLMModel = useLLMQueryStore((state) => state.setLLMModel)
  const setLLMApiKey = useLLMQueryStore((state) => state.setLLMApiKey)
  const LLMModel = useLLMQueryStore((state) => state.LLMModel)
  const LLMApiKey = useLLMQueryStore((state) => state.LLMApiKey)

  const [showDialog, setShowDialog] = useState(false)
  const [localLLMModel, setLocalLLMModel] = useState<LLMModel>(LLMModel)
  const [localLLMApiKey, setLocalLLMApiKey] = useState<string>(LLMApiKey)
  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )

  const summary = useNetworkSummaryStore(
    (state) => state.summaries[currentNetworkId],
  )

  const disabled = !isHCX(summary) || loading

  const menuItem = (
    <MenuItem disabled={disabled} onClick={() => setShowDialog(true)}>
      LLM Query Options
    </MenuItem>
  )

  const dialog = (
    <Dialog
      maxWidth="sm"
      fullWidth={true}
      open={showDialog}
      onClose={props.handleClose}
    >
      <DialogTitle>LLM Query Options</DialogTitle>
      <DialogContent sx={{ p: 1 }}>
        <FormControl sx={{ mb: 1, mt: 1 }} fullWidth>
          <InputLabel>LLM Model</InputLabel>
          <Select
            size="small"
            value={localLLMModel}
            label="LLM Model"
            onChange={(e) => setLocalLLMModel(e.target.value)}
          >
            {models.map((m) => {
              return (
                <MenuItem key={m} value={m}>
                  {m}
                </MenuItem>
              )
            })}
          </Select>
        </FormControl>
        <TextField
          size="small"
          value={localLLMApiKey}
          fullWidth
          label="OpenAI API Key"
          onChange={(e) => setLocalLLMApiKey(e.target.value)}
        ></TextField>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            setShowDialog(false)
            setLLMModel(localLLMModel)
            setLLMApiKey(localLLMApiKey)
          }}
        >
          Confirm
        </Button>
        <Button color="error" onClick={props.handleClose}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  )

  if (!disabled) {
    return (
      <>
        {menuItem}
        {dialog}
      </>
    )
  } else {
    const tooltipTitle = loading
      ? 'Generating response...'
      : 'LLM query is only available for HCX networks'
    return (
      <Tooltip title={tooltipTitle}>
        <Box>{menuItem}</Box>
      </Tooltip>
    )
  }
}
