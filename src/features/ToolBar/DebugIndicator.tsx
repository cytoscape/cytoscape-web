import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined'
import Tooltip from '@mui/material/Tooltip'

import { useDebugEnabled } from '@/data/hooks/useDebugEnabled'

/**
 * Small toolbar badge shown only while debug mode is on, so the otherwise
 * silent backtick toggle (see src/debug.ts) has visible feedback.
 */
export const DebugIndicator = (): JSX.Element | null => {
  const debugEnabled = useDebugEnabled()

  if (!debugEnabled) {
    return null
  }

  return (
    <Tooltip title="Debug mode is on — press ` to turn it off">
      <BugReportOutlinedIcon
        data-testid="debug-indicator"
        sx={{
          color: 'warning.main',
          fontSize: 18,
          mr: 1,
          opacity: 0.85,
        }}
      />
    </Tooltip>
  )
}
