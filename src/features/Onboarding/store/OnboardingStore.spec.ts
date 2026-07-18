import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useOnboardingStore } from './OnboardingStore'
import {
  loadOnboardingState,
  ONBOARDING_STORAGE_KEY,
  saveOnboardingState,
} from './onboardingPersistence'

describe('onboardingPersistence', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns defaults when nothing is stored', () => {
    expect(loadOnboardingState()).toEqual({
      hasSeenWelcome: false,
      completedTours: [],
      dismissedHints: [],
    })
  })

  it('round-trips state through localStorage', () => {
    saveOnboardingState({
      hasSeenWelcome: true,
      completedTours: ['getting-started'],
      dismissedHints: ['hint-a'],
    })
    expect(loadOnboardingState()).toEqual({
      hasSeenWelcome: true,
      completedTours: ['getting-started'],
      dismissedHints: ['hint-a'],
    })
  })

  it('falls back to defaults on corrupt JSON', () => {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, '{not valid json')
    expect(loadOnboardingState()).toEqual({
      hasSeenWelcome: false,
      completedTours: [],
      dismissedHints: [],
    })
  })
})

describe('useOnboardingStore', () => {
  beforeEach(() => {
    window.localStorage.clear()
    const { result } = renderHook(() => useOnboardingStore())
    act(() => result.current.reset())
  })

  it('starts with first-run state', () => {
    const { result } = renderHook(() => useOnboardingStore())
    expect(result.current.hasSeenWelcome).toBe(false)
    expect(result.current.activeTour).toBeNull()
    expect(result.current.completedTours).toEqual([])
  })

  it('markWelcomeSeen sets the flag and persists it', () => {
    const { result } = renderHook(() => useOnboardingStore())
    act(() => result.current.markWelcomeSeen())
    expect(result.current.hasSeenWelcome).toBe(true)
    expect(loadOnboardingState().hasSeenWelcome).toBe(true)
  })

  it('startTour marks welcome seen and sets the active tour', () => {
    const { result } = renderHook(() => useOnboardingStore())
    act(() => result.current.startTour('getting-started'))
    expect(result.current.activeTour).toBe('getting-started')
    expect(result.current.hasSeenWelcome).toBe(true)
    // activeTour is transient — not persisted.
    expect(loadOnboardingState()).not.toHaveProperty('activeTour')
  })

  it('completeTour records completion once and clears the active tour', () => {
    const { result } = renderHook(() => useOnboardingStore())
    act(() => result.current.startTour('getting-started'))
    act(() => result.current.completeTour('getting-started'))
    act(() => result.current.completeTour('getting-started'))
    expect(result.current.activeTour).toBeNull()
    expect(result.current.completedTours).toEqual(['getting-started'])
    expect(loadOnboardingState().completedTours).toEqual(['getting-started'])
  })

  it('stopTour clears the active tour without recording completion', () => {
    const { result } = renderHook(() => useOnboardingStore())
    act(() => result.current.startTour('getting-started'))
    act(() => result.current.stopTour())
    expect(result.current.activeTour).toBeNull()
    expect(result.current.completedTours).toEqual([])
  })

  it('dismissHint records a hint once', () => {
    const { result } = renderHook(() => useOnboardingStore())
    act(() => result.current.dismissHint('hint-a'))
    act(() => result.current.dismissHint('hint-a'))
    expect(result.current.dismissedHints).toEqual(['hint-a'])
  })
})
