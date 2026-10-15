import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { Box, Skeleton, Typography } from '@mui/material'
import { lazy, type ReactElement, Suspense, useEffect } from 'react'
import { createPortal } from 'react-dom'

import { useDemoSlot } from './DemoSlot'
import type { LiveDemoProps } from './LiveDemoBody'

// The demo pulls in the renderer and the Style panel. Loaded only when a page
// that uses it renders.
const LiveDemoBody = lazy(() => import('./LiveDemoBody'))

export const LIVE_DEMO_HEIGHT = 520

/**
 * A working copy of part of the editor, embedded in manual text, running on a
 * bundled fixture network in the manual's sandbox database.
 *
 * One per page: the demo sets the workspace's current network, which the
 * Style panel and undo read.
 *
 * In the `split` layout the demo renders in the page's pinned column (see
 * DemoSlot) and the text keeps a pointer to it.
 */
export const LiveDemo = (props: LiveDemoProps): ReactElement => {
  const { target, register } = useDemoSlot()
  useEffect(register, [register])

  if (target !== null) {
    return (
      <>
        <Box
          data-testid="manual-live-demo-pointer"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            my: 2,
            px: 1.5,
            py: 1,
            borderLeft: 3,
            borderColor: 'primary.main',
            bgcolor: 'action.hover',
            borderRadius: '0 4px 4px 0',
          }}
        >
          <Typography variant="body2" sx={{ flex: 1 }}>
            The live demo for this page is on the right. Try each step there as
            you read.
          </Typography>
          <ArrowForwardIcon fontSize="small" color="primary" />
        </Box>
        {createPortal(
          <Suspense fallback={<Skeleton variant="rounded" height="100%" />}>
            <LiveDemoBody {...props} fill />
          </Suspense>,
          target,
        )}
      </>
    )
  }

  return (
    <Suspense
      fallback={
        <Box sx={{ my: 3 }}>
          <Skeleton
            variant="rounded"
            height={props.height ?? LIVE_DEMO_HEIGHT}
          />
        </Box>
      }
    >
      <LiveDemoBody {...props} />
    </Suspense>
  )
}
