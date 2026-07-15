import { useSyncExternalStore } from 'react'

import { isDebugEnabled, subscribeDebug } from '@/debug'

export const useDebugEnabled = (): boolean =>
  useSyncExternalStore(subscribeDebug, isDebugEnabled, isDebugEnabled)
