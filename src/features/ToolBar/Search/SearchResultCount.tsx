import { Box, Tooltip, Typography, useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'

import { SearchResultSummary } from './searchResultSummary'

// Hidden on screen but read by screen readers.
const visuallyHidden = {
  border: 0,
  clip: 'rect(0 0 0 0)',
  height: '1px',
  margin: '-1px',
  overflow: 'hidden',
  padding: 0,
  position: 'absolute',
  whiteSpace: 'nowrap',
  width: '1px',
} as const

interface SearchResultCountProps {
  /** The last search's result; `undefined` hides the count. */
  summary: SearchResultSummary | undefined
  /** Lets the search field hold back its examples tooltip over the count. */
  onHoverChange: (hovered: boolean) => void
}

/**
 * What the last search selected, shown inside the search field. The field is
 * 30vw wide, so below the `lg` breakpoint the count drops its nouns; the
 * tooltip always has the whole sentence, which also names the view of a
 * hierarchy that was searched.
 */
export const SearchResultCount = ({
  summary,
  onHoverChange,
}: SearchResultCountProps): JSX.Element => {
  const theme = useTheme()
  const narrow = useMediaQuery(theme.breakpoints.down('lg'))

  return (
    <>
      {summary !== undefined ? (
        <Tooltip title={summary.sentence} placement="bottom" arrow>
          <Typography
            data-testid="search-result-count"
            variant="caption"
            noWrap
            onMouseEnter={() => onHoverChange(true)}
            onMouseLeave={() => onHoverChange(false)}
            sx={{
              flexShrink: 0,
              pl: 1,
              color: theme.palette.text.secondary,
              cursor: 'default',
            }}
          >
            {narrow ? summary.compactLabel : summary.label}
          </Typography>
        </Tooltip>
      ) : null}
      {/* Mounted before any result, so the first one is announced too. */}
      <Box
        component="span"
        role="status"
        data-testid="search-result-announcement"
        sx={visuallyHidden}
      >
        {summary?.sentence ?? ''}
      </Box>
    </>
  )
}
