import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
  Tooltip,
  Typography,
} from '@mui/material'

import { DisplayMode } from '@/models/FilterModel/DisplayMode'

import { AUTO_APPLY_ELEMENT_LIMIT } from '../utils/filterTabUtil'

interface ApplyPanelProps {
  displayMode: DisplayMode
  autoApply: boolean
  status: string | undefined
  disabled: boolean
  onDisplayModeChange: (displayMode: DisplayMode) => void
  onAutoApplyChange: (autoApply: boolean) => void
  onApply: () => void
}

/**
 * "Apply when filter changes", select / show, the Apply button and the
 * result of the last run (Cytoscape Desktop's apply panel)
 */
export const ApplyPanel = ({
  displayMode,
  autoApply,
  status,
  disabled,
  onDisplayModeChange,
  onAutoApplyChange,
  onApply,
}: ApplyPanelProps): JSX.Element => (
  <Box
    data-testid="filter-apply-panel"
    sx={{
      display: 'flex',
      flexDirection: 'column',
      px: 1,
      py: 1,
      backgroundColor: 'background.default',
    }}
  >
    <Tooltip
      title={`Turned off by default for networks with ${AUTO_APPLY_ELEMENT_LIMIT.toLocaleString()} or more nodes and edges`}
      placement="top-start"
    >
      <FormControlLabel
        sx={{ m: 0 }}
        control={
          <Checkbox
            size="small"
            checked={autoApply}
            disabled={disabled}
            inputProps={{ 'aria-label': 'Apply when filter changes' }}
            data-testid="filter-auto-apply-checkbox"
            onChange={(event) => onAutoApplyChange(event.target.checked)}
          />
        }
        label={
          <Typography variant="body2">Apply when filter changes</Typography>
        }
      />
    </Tooltip>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1.5 }}>
      <RadioGroup
        row
        value={displayMode}
        aria-label="Apply the filter by"
        onChange={(event) =>
          onDisplayModeChange(event.target.value as DisplayMode)
        }
      >
        <FormControlLabel
          value={DisplayMode.SELECT}
          disabled={disabled}
          control={
            <Radio size="small" data-testid="filter-display-mode-select" />
          }
          label={<Typography variant="body2">select</Typography>}
        />
        <FormControlLabel
          value={DisplayMode.SHOW_HIDE}
          disabled={disabled}
          control={
            <Radio size="small" data-testid="filter-display-mode-show" />
          }
          label={<Typography variant="body2">show</Typography>}
        />
      </RadioGroup>
      <Box sx={{ flex: 1 }} />
      <Button
        size="small"
        variant="contained"
        disabled={disabled}
        data-testid="filter-apply-button"
        onClick={onApply}
      >
        Apply
      </Button>
    </Box>
    <Typography
      variant="caption"
      color="text.secondary"
      data-testid="filter-status"
      sx={{ minHeight: '1.5em', mt: 0.5, ml: 1.5, pt: 0.25, borderTop: '1px solid', borderColor: 'divider' }}
    >
      {status ?? '\u00A0'}
    </Typography>
  </Box>
)
