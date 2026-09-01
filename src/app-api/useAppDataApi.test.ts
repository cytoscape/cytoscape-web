// src/app-api/useAppDataApi.test.ts
import { renderHook } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import { AppIdProvider } from './AppIdContext'
import { buildPerAppApis } from './core/perAppApis'
import { useAppDataApi } from './useAppDataApi'

describe('useAppDataApi', () => {
  it('returns the host-built appData instance for the surrounding app', () => {
    const apis = buildPerAppApis('analyzer')
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(AppIdProvider, { value: { appId: 'analyzer', apis } }, children)

    const { result } = renderHook(() => useAppDataApi(), { wrapper })

    expect(result.current).toBe(apis.appData)
  })

  it('returns null outside the app-context boundary', () => {
    // No appId means no scope to bind entries to, so there is no API to hand
    // back — see the hook's doc comment.
    const { result } = renderHook(() => useAppDataApi())

    expect(result.current).toBeNull()
  })
})
