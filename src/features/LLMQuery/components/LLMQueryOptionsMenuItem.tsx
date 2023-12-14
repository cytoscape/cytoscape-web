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
  ButtonGroup,
  IconButton,
} from '@mui/material'
import { ReactElement, useState } from 'react'
import { BaseMenuProps } from '../../../components/ToolBar/BaseMenuProps'
import { LLMModel, models } from '../model/LLMModel'
import { useLLMQueryStore } from '../store'
import { LLMTemplate, templates } from '../model/LLMTemplate'
import { ContentCopy, Preview } from '@mui/icons-material'
import { useMessageStore } from '../../../store/MessageStore'

export const LLMQueryOptionsMenuItem = (props: BaseMenuProps): ReactElement => {
  const [showTemplatePreview, setShowTemplatePreview] = useState(false)
  const addMessage = useMessageStore((state) => state.addMessage)
  const loading = useLLMQueryStore((state) => state.loading)
  const setLLMModel = useLLMQueryStore((state) => state.setLLMModel)
  const setLLMApiKey = useLLMQueryStore((state) => state.setLLMApiKey)
  const LLMModel = useLLMQueryStore((state) => state.LLMModel)
  const LLMTemplate = useLLMQueryStore((state) => state.LLMTemplate)
  const setLLMTemplate = useLLMQueryStore((state) => state.setLLMTemplate)

  const [showDialog, setShowDialog] = useState(false)
  const [localLLMModel, setLocalLLMModel] = useState<LLMModel>(LLMModel)
  const [localLLMApiKey, setLocalLLMApiKey] = useState<string>('')
  const [localLLMTemplate, setLocalLLMTemplate] =
    useState<LLMTemplate>(LLMTemplate)

  const disabled = loading

  const menuItem = (
    <MenuItem disabled={disabled} onClick={() => setShowDialog(true)}>
      LLM Query Options
    </MenuItem>
  )

  const copyTextToClipboard = async (text: string): Promise<void> => {
    if ('clipboard' in navigator) {
      return await navigator.clipboard.writeText(text)
    }
  }

  const handleCopyTemplateClick = (): void => {
    void copyTextToClipboard(localLLMTemplate.rawText).then(() => {
      addMessage({
        message: `LLM template copied to clipboard`,
        duration: 6000,
      })
    })
  }

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
        <Tooltip title="You need to add an API key generated in your PAID account">
          <TextField
            size="small"
            value={localLLMApiKey}
            fullWidth
            label="OpenAI API Key"
            onChange={(e) => setLocalLLMApiKey(e.target.value)}
          ></TextField>
        </Tooltip>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Template</InputLabel>
            <Select
              size="small"
              value={localLLMTemplate.name}
              label="Template"
              onChange={(e) => {
                const nextTemplate = templates.find(
                  (t) => t.name === e.target.value,
                )
                if (nextTemplate !== undefined) {
                  setLocalLLMTemplate(nextTemplate)
                }
              }}
            >
              {templates.map((t) => {
                return (
                  <MenuItem key={t.name} value={t.name}>
                    {t.name}
                  </MenuItem>
                )
              })}
            </Select>
          </FormControl>
          <ButtonGroup size="small" variant="contained" sx={{ ml: 1 }}>
            <Tooltip title="Preview selected template">
              <IconButton
                sx={{
                  color: showTemplatePreview ? 'primary.main' : 'inherit',
                }}
                aria-label="preview"
                onClick={() => {
                  setShowTemplatePreview(!showTemplatePreview)
                }}
              >
                <Preview />
              </IconButton>
            </Tooltip>
            <Tooltip title="Copy selected template text">
              <IconButton aria-label="copy" onClick={handleCopyTemplateClick}>
                <ContentCopy />
              </IconButton>
            </Tooltip>
          </ButtonGroup>
        </Box>
        <Box
          sx={{
            mt: 2,
            maxHeight: 300,
            overflowY: 'scroll',
            p: 2,
            whiteSpace: 'pre-line',
          }}
        >
          {(showTemplatePreview && localLLMTemplate?.rawText) ?? ''}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            setShowDialog(false)
            setLLMModel(localLLMModel)
            setLLMTemplate(localLLMTemplate)
            if (localLLMApiKey !== '') {
              setLLMApiKey(localLLMApiKey)
            }
            props.handleClose()
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
    const tooltipTitle = 'Generating response...'
    return (
      <Tooltip title={tooltipTitle}>
        <Box>{menuItem}</Box>
      </Tooltip>
    )
  }
}
