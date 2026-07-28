import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAppStore } from '../../../data/hooks/stores/AppStore'
import { RootMenu } from '../../../models/AppModel/RootMenu'
import { ServiceStatus } from '../../../models/AppModel/ServiceStatus'

const mockRun = vi.fn()
vi.mock('../../../data/hooks/useServiceTaskRunner', () => ({
  useServiceTaskRunner: () => mockRun,
}))

import { useServiceAppMenu } from './useServiceAppMenu'

// The ConfirmationDialog inside `dialogs` carries the notification state
const getNotification = (dialogs: any) => {
  const [, confirmation] = dialogs.props.children
  return {
    open: confirmation.props.open as boolean,
    message: confirmation.props.message as string,
  }
}

describe('useServiceAppMenu', () => {
  const clearCurrentTask = vi.fn()

  beforeEach(() => {
    mockRun.mockReset()
    clearCurrentTask.mockReset()
    act(() => {
      useAppStore.setState({ serviceApps: {}, clearCurrentTask })
    })
  })

  it('runs the task and shows no error notification on completion', async () => {
    mockRun.mockResolvedValue({
      status: ServiceStatus.Complete,
      algorithmName: 'algo',
      message: 'ok',
    })
    const onBeforeRun = vi.fn()
    const { result } = renderHook(() =>
      useServiceAppMenu(RootMenu.Apps, onBeforeRun),
    )

    await act(() => result.current.handleRun('http://svc'))

    expect(onBeforeRun).toHaveBeenCalledTimes(1)
    expect(mockRun).toHaveBeenCalledWith('http://svc')
    expect(clearCurrentTask).toHaveBeenCalledTimes(1)
    expect(getNotification(result.current.dialogs).open).toBe(false)
  })

  it('surfaces the service message when the task does not complete', async () => {
    mockRun.mockResolvedValue({
      status: ServiceStatus.Failed,
      algorithmName: 'algo',
      message: 'service exploded',
    })
    const { result } = renderHook(() => useServiceAppMenu(RootMenu.Apps))

    await act(() => result.current.handleRun('http://svc'))

    const notification = getNotification(result.current.dialogs)
    expect(notification.open).toBe(true)
    expect(notification.message).toContain('service exploded')
    expect(clearCurrentTask).toHaveBeenCalledTimes(1)
  })

  it('surfaces thrown errors and still clears the current task', async () => {
    mockRun.mockRejectedValue(new Error('network down'))
    const { result } = renderHook(() => useServiceAppMenu(RootMenu.Apps))

    await act(() => result.current.handleRun('http://svc'))

    const notification = getNotification(result.current.dialogs)
    expect(notification.open).toBe(true)
    expect(notification.message).toContain('network down')
    expect(clearCurrentTask).toHaveBeenCalledTimes(1)
  })

  it('builds menu items only from apps routed to the requested root menu', () => {
    act(() => {
      useAppStore.setState({
        serviceApps: {
          'http://apps-app': {
            url: 'http://apps-app',
            name: 'Apps App',
            cyWebMenuItem: {
              root: RootMenu.Apps,
              path: [{ name: 'Apps App', gravity: 0 }],
            },
          },
          'http://tools-app': {
            url: 'http://tools-app',
            name: 'Tools App',
            cyWebMenuItem: {
              root: RootMenu.Tools,
              path: [{ name: 'Tools App', gravity: 0 }],
            },
          },
        } as any,
      })
    })

    const { result } = renderHook(() => useServiceAppMenu(RootMenu.Tools))

    expect(result.current.menuItems.map((i) => i.label)).toEqual([
      'Tools App',
    ])
  })
})
