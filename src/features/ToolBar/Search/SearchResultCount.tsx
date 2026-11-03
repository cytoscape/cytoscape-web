import { Box, Tooltip, Typography, useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useEffect, useState } from 'react'

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
  /** Changes with every search, so a repeated result is announced again. */
  announcementId: number
  /**
   * Whether the pointer or the keyboard focus is on the count, so the search
   * field can hold back its examples tooltip meanwhile.
   */
  onActiveChange: (active: boolean) => void
}

interface CountLabelProps {
  summary: SearchResultSummary
  onActiveChange: (active: boolean) => void
}

/**
 * The count itself. A new search replaces its summary in the same render, so
 * it stays mounted and keeps its hover and focus; it reports itself inactive
 * only when it unmounts, since no mouse-leave or blur follows then.
 */
const CountLabel = ({
  summary,
  onActiveChange,
}: CountLabelProps): JSX.Element => {
  const theme = useTheme()
  const narrow = useMediaQuery(theme.breakpoints.down('lg'))
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const active = hovered || focused

  useEffect(() => {
    onActiveChange(active)
  }, [active, onActiveChange])

  useEffect(() => () => onActiveChange(false), [onActiveChange])

  return (
    <Tooltip title={summary.sentence} placement="bottom" arrow>
      <Typography
        data-testid="search-result-count"
        variant="caption"
        noWrap
        // Focusable, so keyboard users get the tooltip too: below `lg` the
        // label is only numbers.
        tabIndex={0}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
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
  )
}

/**
 * What the last search selected, shown inside the search field. The field is
 * 30vw wide, so below the `lg` breakpoint the count drops its nouns; the
 * tooltip always has the whole sentence, which also names the view of a
 * hierarchy that was searched.
 */
export const SearchResultCount = ({
  summary,
  announcementId,
  onActiveChange,
}: SearchResultCountProps): JSX.Element => {
  return (
    <>
      {summary !== undefined ? (
        <CountLabel summary={summary} onActiveChange={onActiveChange} />
      ) : null}
      {/* Mounted before any result, so the first one is announced too. The
          sentence is re-created for every search: a repeated search with the
          same result would otherwise leave the region unchanged, and screen
          readers announce only changes. */}
      <Box
        component="span"
        role="status"
        data-testid="search-result-announcement"
        sx={visuallyHidden}
      >
        {summary !== undefined ? (
          <span key={announcementId}>{summary.sentence}</span>
        ) : null}
      </Box>
    </>
  )
}
