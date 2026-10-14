import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Popover,
  TextField,
  Typography,
} from '@mui/material'
import { KeyboardEvent, useEffect, useRef, useState } from 'react'

import { useFilterStore } from '@/data/hooks/stores/FilterStore'
import { useMessageStore } from '@/data/hooks/stores/MessageStore'
import { useNetworkStore } from '@/data/hooks/stores/NetworkStore'
import { useTableStore } from '@/data/hooks/stores/TableStore'
import {
  isLLMConfigured,
  llmRecipientLabel,
  selectApiKey,
} from '@/features/LLMQuery/model/LLMProvider'
import { useLLMQueryStore } from '@/features/LLMQuery/store'
import { DisplayMode } from '@/models/FilterModel/DisplayMode'
import { MAX_SAMPLES } from '@/models/FilterModel/impl/generation/filterContext'
import { MAX_REQUEST_LENGTH } from '@/models/FilterModel/impl/generation/filterPrompt'
import type { IdType } from '@/models/IdType'
import { MessageSeverity } from '@/models/MessageModel'

import {
  generateFilter,
  GenerateFilterResult,
  NOT_CONFIGURED_MESSAGE,
} from '../llm/generateFilter'

const MODE_LABEL: Record<DisplayMode, string> = {
  [DisplayMode.SELECT]: 'select mode',
  [DisplayMode.SHOW_HIDE]: 'show mode',
}

/**
 * What leaves the browser, and where to: the disclosure the user reads
 * before generating (LLM_FILTER_GENERATION_SPEC.md, "Popover")
 */
export const describeDisclosure = (recipient: string): string =>
  `Sent to ${recipient}: your description, and this network's size, degree ranges, column names, column types, value ranges and up to ${MAX_SAMPLES} sample values per text column. Nothing else leaves the browser.`

/** The status line for a request that made no filter */
export const describeOutcome = (
  result: Exclude<GenerateFilterResult, { kind: 'filter' }>,
): string | undefined => {
  switch (result.kind) {
    case 'unsupported':
      return `This can't be expressed as a filter: ${result.reason}`
    case 'failed':
      return result.reason === NOT_CONFIGURED_MESSAGE
        ? result.reason
        : `Couldn't build a filter: ${result.reason}`
    case 'cancelled':
      return undefined
  }
}

interface FormProps {
  networkId: IdType
  onClose: () => void
}

/**
 * The popover's content. It mounts with the popover, so every opening
 * starts empty, and unmounting aborts a request still running.
 */
const FilterFromDescriptionForm = ({
  networkId,
  onClose,
}: FormProps): JSX.Element => {
  const providerId = useLLMQueryStore((state) => state.LLMProvider)
  const baseUrl = useLLMQueryStore((state) => state.LLMBaseUrl)
  const model = useLLMQueryStore((state) => state.LLMModel)
  const openAiKey = useLLMQueryStore((state) => state.LLMApiKey)
  const customKey = useLLMQueryStore((state) => state.LLMCustomApiKey)
  const addWorkspaceFilters = useFilterStore(
    (state) => state.addWorkspaceFilters,
  )
  const setDisplayMode = useFilterStore(
    (state) => state.setWorkspaceFilterDisplayMode,
  )
  const setSelected = useFilterStore(
    (state) => state.setSelectedWorkspaceFilterId,
  )
  const addMessage = useMessageStore((state) => state.addMessage)

  const [text, setText] = useState<string>('')
  const [running, setRunning] = useState<boolean>(false)
  const [status, setStatus] = useState<string | undefined>()
  const controller = useRef<AbortController | undefined>()

  useEffect(() => () => controller.current?.abort(), [])

  // Keys are provider-scoped: the OpenAI key must never reach another endpoint
  const apiKey = selectApiKey(providerId, { openAiKey, customKey })
  const configured = isLLMConfigured(providerId, apiKey, baseUrl)

  const cancel = (): void => {
    controller.current?.abort()
    onClose()
  }

  const generate = async (): Promise<void> => {
    if (!configured || running || text.trim() === '') return
    const network = useNetworkStore.getState().networks.get(networkId)
    const tables = useTableStore.getState().tables[networkId]
    if (network === undefined || tables === undefined) {
      setStatus("Couldn't build a filter: the network is not loaded.")
      return
    }
    const current = new AbortController()
    controller.current = current
    setRunning(true)
    setStatus(undefined)
    const result = await generateFilter({
      request: text,
      network,
      nodeTable: tables.nodeTable,
      edgeTable: tables.edgeTable,
      settings: { providerId, baseUrl, model, apiKey },
      signal: current.signal,
    })
    // Cancelled, or closed: the popover is gone
    if (current.signal.aborted) return
    controller.current = undefined
    setRunning(false)

    if (result.kind !== 'filter') {
      setStatus(describeOutcome(result))
      return
    }
    const [added] = addWorkspaceFilters([result.filter])
    setDisplayMode(added.id, result.displayMode)
    setSelected(added.id)
    addMessage({
      message: `Created filter "${added.name}" (${MODE_LABEL[result.displayMode]}).${result.explanation === '' ? '' : ` ${result.explanation}`}`,
      duration: 8000,
      severity: MessageSeverity.SUCCESS,
    })
    onClose()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    // Enter generates, Shift+Enter adds a line
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault()
      void generate()
    }
  }

  const shownStatus = configured
    ? running
      ? `Asking ${model}…`
      : status
    : NOT_CONFIGURED_MESSAGE

  return (
    <Box
      data-testid="filter-describe-form"
      sx={{ p: 2, width: 420, maxWidth: 'calc(100vw - 32px)' }}
    >
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        New filter from description
      </Typography>
      <TextField
        autoFocus
        fullWidth
        multiline
        minRows={3}
        maxRows={6}
        size="small"
        value={text}
        placeholder="Show only kinases with more than 5 interactions"
        disabled={!configured}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={onKeyDown}
        inputProps={{
          maxLength: MAX_REQUEST_LENGTH,
          readOnly: running,
          'aria-label': 'Filter description',
          'data-testid': 'filter-describe-input',
        }}
        helperText={
          <Box
            component="span"
            sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}
          >
            <span>Start with "select", "show only" or "hide".</span>
            <span>
              {text.length}/{MAX_REQUEST_LENGTH}
            </span>
          </Box>
        }
      />
      <Typography
        variant="body2"
        role="status"
        aria-live="polite"
        data-testid="filter-describe-status"
        color={running || !configured ? 'text.secondary' : 'warning.main'}
        sx={{ minHeight: '1.5em', mt: 1, overflowWrap: 'anywhere' }}
      >
        {shownStatus}
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
        {/* The only way out: the popover ignores click-away and Escape
            (docs/specifications/DIALOG_DISMISS_POLICY.md) */}
        <Button
          size="small"
          data-testid="filter-describe-cancel"
          onClick={cancel}
        >
          Cancel
        </Button>
        <Button
          size="small"
          variant="contained"
          data-testid="filter-describe-generate"
          disabled={!configured || running || text.trim() === ''}
          startIcon={
            running ? <CircularProgress size={14} color="inherit" /> : undefined
          }
          onClick={() => void generate()}
        >
          {running ? 'Generating…' : 'Generate'}
        </Button>
      </Box>
      <Divider sx={{ my: 1.5 }} />
      <Typography
        variant="caption"
        color="text.secondary"
        component="p"
        data-testid="filter-describe-disclosure"
      >
        {describeDisclosure(llmRecipientLabel(providerId, baseUrl))}
      </Typography>
    </Box>
  )
}

interface FilterFromDescriptionProps {
  anchorEl: HTMLElement | null
  open: boolean
  networkId: IdType
  onClose: () => void
}

/**
 * "New filter from description…": a modal form popover where the user
 * describes a filter for the LLM of the LLM Query Options dialog to build
 * (docs/specifications/LLM_FILTER_GENERATION_SPEC.md)
 */
export const FilterFromDescription = ({
  anchorEl,
  open,
  networkId,
  onClose,
}: FilterFromDescriptionProps): JSX.Element => (
  <Popover
    data-testid="filter-describe-popover"
    open={open && anchorEl !== null}
    anchorEl={anchorEl}
    disableEscapeKeyDown={true}
    hideBackdrop={true}
    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
  >
    <FilterFromDescriptionForm networkId={networkId} onClose={onClose} />
  </Popover>
)
