import type { ReactElement, ReactNode } from 'react'

import { LIVE_DEMOS_ENABLED } from './liveDemoSwitch'

/**
 * Page text that only makes sense next to the page's live demo, such as "try
 * it on the demo network". Hidden with the demos (LIVE_DEMOS_ENABLED).
 */
export const DemoOnly = ({
  children,
}: {
  children: ReactNode
}): ReactElement | null => (LIVE_DEMOS_ENABLED ? <>{children}</> : null)

/** Page text shown in place of the live demos while they are hidden. */
export const WithoutDemo = ({
  children,
}: {
  children: ReactNode
}): ReactElement | null => (LIVE_DEMOS_ENABLED ? null : <>{children}</>)
