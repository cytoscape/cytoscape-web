import { Box, Skeleton } from '@mui/material'
import { lazy, type ReactElement, Suspense } from 'react'

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
 */
export const LiveDemo = (props: LiveDemoProps): ReactElement => (
  <Suspense
    fallback={
      <Box sx={{ my: 3 }}>
        <Skeleton variant="rounded" height={props.height ?? LIVE_DEMO_HEIGHT} />
      </Box>
    }
  >
    <LiveDemoBody {...props} />
  </Suspense>
)
