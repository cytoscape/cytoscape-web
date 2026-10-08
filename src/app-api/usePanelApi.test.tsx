// src/app-api/usePanelApi.test.tsx
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { expect, it } from 'vitest'

import { AppIdProvider } from './AppIdContext'
import { createPanelApi, panelApi } from './core/panelApi'
import type { AppContextApis } from './types/AppContext'
import { usePanelApi } from './usePanelApi'

it('returns the anonymous panelApi outside the app-context boundary', () => {
  const { result } = renderHook(() => usePanelApi())
  expect(result.current).toBe(panelApi)
})

it("returns the calling app's instance inside the boundary", () => {
  const panel = createPanelApi('app1')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AppIdProvider
      value={{ appId: 'app1', apis: { panel } as unknown as AppContextApis }}
    >
      {children}
    </AppIdProvider>
  )

  const { result } = renderHook(() => usePanelApi(), { wrapper })
  expect(result.current).toBe(panel)
})
