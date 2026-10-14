import BrokenImageIcon from '@mui/icons-material/BrokenImage'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import {
  Box,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from '@mui/material'
import { useEffect, useRef, useState } from 'react'

import { VisualStyle } from '@/models/VisualStyleModel'
import { PreviewSample } from './preview/previewSample'
import { useStyleThumbnail } from './preview/useStyleThumbnail'

export interface StyleTileAction {
  label: string
  onSelect: () => void
  disabled?: boolean
}

export interface StyleTileProps {
  name: string
  /**
   * Style content to preview. Undefined while an off-network style is still
   * being read from IndexedDB, which shows a spinner rather than an empty tile.
   */
  visualStyle?: VisualStyle
  sample: PreviewSample
  selected: boolean
  /** Secondary line, e.g. the network a style was copied from. */
  provenance?: string
  onClick: () => void
  actions?: StyleTileAction[]
  testId: string
}

const TILE_HEIGHT = 110

/**
 * True once the element has been on screen, so a tile only pays for its
 * thumbnail if it is actually looked at.
 *
 * Returns true immediately when IntersectionObserver is unavailable (jsdom):
 * degrading to "render everything" keeps behaviour correct where laziness is
 * merely an optimization.
 */
const useHasBeenVisible = (
  ref: React.RefObject<HTMLElement | null>,
): boolean => {
  const [visible, setVisible] = useState(
    () => typeof IntersectionObserver === 'undefined',
  )

  useEffect(() => {
    if (visible) {
      return
    }
    const element = ref.current
    if (element === null) {
      return
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true)
        observer.disconnect()
      }
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, visible])

  return visible
}

/**
 * One style in the picker grid: a thumbnail of the style rendered on the sample
 * graph, its name, and an optional management menu.
 */
export const StyleTile = (props: StyleTileProps): React.ReactElement => {
  const {
    name,
    visualStyle,
    sample,
    selected,
    provenance,
    onClick,
    actions,
    testId,
  } = props

  const tileRef = useRef<HTMLDivElement>(null)
  const hasBeenVisible = useHasBeenVisible(tileRef)
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  // Gated on visibility: a grid of tiles should not render thumbnails nobody
  // has scrolled to.
  const { dataUrl: thumbnail, failed: thumbnailFailed } = useStyleThumbnail(
    visualStyle,
    sample,
    hasBeenVisible,
  )

  return (
    <Box
      ref={tileRef}
      data-testid={testId}
      onClick={onClick}
      role="option"
      aria-selected={selected}
      tabIndex={0}
      onKeyDown={(e) => {
        // Only when the option itself has focus. Enter on the menu IconButton
        // inside fires that button AND bubbles here, so without this guard
        // opening the menu also applied the style.
        if (e.target !== e.currentTarget) {
          return
        }
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      sx={{
        position: 'relative',
        border: (theme) =>
          `2px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
        borderRadius: 1,
        cursor: 'pointer',
        overflow: 'hidden',
        '&:hover': { borderColor: 'primary.light' },
        '&:hover .style-tile-menu': { opacity: 1 },
        '&:focus-visible': {
          outline: (theme) => `2px solid ${theme.palette.primary.dark}`,
        },
      }}
    >
      <Box
        sx={{
          height: TILE_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // Light neutral rather than the paper colour: node fills are often
          // white or transparent, and on a white tile those styles read as an
          // empty box (a real weakness of Cytoscape Desktop's picker).
          backgroundColor: '#f5f5f5',
          backgroundImage:
            'linear-gradient(45deg, #ebebeb 25%, transparent 25%, transparent 75%, #ebebeb 75%),' +
            'linear-gradient(45deg, #ebebeb 25%, transparent 25%, transparent 75%, #ebebeb 75%)',
          backgroundSize: '16px 16px',
          backgroundPosition: '0 0, 8px 8px',
        }}
      >
        {thumbnail !== undefined ? (
          <Box
            component="img"
            src={thumbnail}
            alt=""
            data-testid={`${testId}-thumbnail`}
            sx={{ maxWidth: '100%', maxHeight: '100%', display: 'block' }}
          />
        ) : thumbnailFailed ? (
          // A spinner here would never stop: the render already gave up. The
          // tile stays selectable — only its preview is missing.
          <BrokenImageIcon
            fontSize="small"
            color="disabled"
            data-testid={`${testId}-preview-failed`}
            titleAccess="Preview unavailable"
          />
        ) : (
          <CircularProgress size={20} data-testid={`${testId}-loading`} />
        )}
      </Box>

      {selected && (
        <CheckCircleIcon
          color="primary"
          fontSize="small"
          data-testid={`${testId}-selected-badge`}
          // A badge as well as the border: selection must not rest on colour
          // alone.
          sx={{
            position: 'absolute',
            top: 4,
            left: 4,
            backgroundColor: 'background.paper',
            borderRadius: '50%',
          }}
        />
      )}

      {actions !== undefined && actions.length > 0 && (
        <>
          <IconButton
            className="style-tile-menu"
            size="small"
            // Icon-only, so it has no text to name it: screen readers announced
            // it as an unlabelled button.
            aria-label={`Actions for style "${name}"`}
            data-testid={`${testId}-menu-button`}
            onClick={(e) => {
              // Or the tile's own onClick would apply the style as a side
              // effect of opening its menu.
              e.stopPropagation()
              setMenuAnchor(e.currentTarget)
            }}
            sx={{
              position: 'absolute',
              top: 2,
              right: 2,
              opacity: 0,
              backgroundColor: 'background.paper',
              '&:hover': { backgroundColor: 'background.paper' },
              // Keyboard users never trigger :hover, so focus must reveal it
              // too or the actions are unreachable without a mouse.
              '&:focus-visible': { opacity: 1 },
            }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
          <Menu
            anchorEl={menuAnchor}
            open={menuAnchor !== null}
            onClose={() => setMenuAnchor(null)}
            onClick={(e) => e.stopPropagation()}
          >
            {actions.map((action) => (
              <MenuItem
                key={action.label}
                disabled={action.disabled}
                data-testid={`${testId}-action-${action.label}`}
                onClick={() => {
                  setMenuAnchor(null)
                  action.onSelect()
                }}
              >
                {action.label}
              </MenuItem>
            ))}
          </Menu>
        </>
      )}

      <Box sx={{ px: 0.75, py: 0.5 }}>
        {/* Full name in a tooltip: style names are long and share prefixes, and
            a clipped label is how Desktop makes two different styles look
            identical. */}
        <Tooltip
          title={provenance === undefined ? name : `${name} — ${provenance}`}
        >
          <Typography
            variant="caption"
            data-testid={`${testId}-name`}
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.25,
              fontWeight: selected ? 600 : 400,
            }}
          >
            {name}
          </Typography>
        </Tooltip>
        {provenance !== undefined && (
          <Typography
            variant="caption"
            data-testid={`${testId}-provenance`}
            sx={{
              display: 'block',
              color: 'text.secondary',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: 10,
            }}
          >
            {provenance}
          </Typography>
        )}
      </Box>
    </Box>
  )
}
