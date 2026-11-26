import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CYTOSCAPE_DESKTOP_UNAVAILABLE_MESSAGE } from '@/models/CxModel/impl/desktopRequirement'

import {
  FeatureAvailabilityProvider,
  useFeatureAvailability,
} from './FeatureAvailabilityProvider'
import { useFeatureAvailabilityPolling } from './useFeatureAvailabilityPolling'

vi.mock('./useFeatureAvailabilityPolling', () => ({
  useFeatureAvailabilityPolling: vi.fn(),
}))

const TooltipProbe = () => {
  const { tooltip } = useFeatureAvailability()
  return <span data-testid="tooltip">{tooltip}</span>
}

const renderTooltip = (): string => {
  render(
    <FeatureAvailabilityProvider>
      <TooltipProbe />
    </FeatureAvailabilityProvider>,
  )
  return screen.getByTestId('tooltip').textContent ?? ''
}

describe('FeatureAvailabilityProvider tooltip', () => {
  beforeEach(() => {
    vi.mocked(useFeatureAvailabilityPolling).mockReset()
  })

  it('states the shared Cytoscape Desktop requirement when Desktop is unreachable (#844)', () => {
    vi.mocked(useFeatureAvailabilityPolling).mockReturnValue({
      isCyDeskAvailable: false,
      isSafari: false,
    })

    expect(renderTooltip()).toBe(CYTOSCAPE_DESKTOP_UNAVAILABLE_MESSAGE)
  })

  it('says the feature is unavailable in Safari', () => {
    vi.mocked(useFeatureAvailabilityPolling).mockReturnValue({
      isCyDeskAvailable: false,
      isSafari: true,
    })

    expect(renderTooltip()).toMatch(/Safari/)
  })

  it('describes the action when Desktop is reachable', () => {
    vi.mocked(useFeatureAvailabilityPolling).mockReturnValue({
      isCyDeskAvailable: true,
      isSafari: false,
    })

    expect(renderTooltip()).toMatch(/Open a copy of the current network/)
  })
})
