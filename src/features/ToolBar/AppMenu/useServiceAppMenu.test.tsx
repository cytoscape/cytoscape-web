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

// The service app's parameter dialog, rendered last inside `dialogs`.
const getAppDialog = (dialogs: any) => dialogs.props.children[2]

const serviceApp = (url: string, name: string) =>
  ({
    url,
    name,
    cyWebMenuItem: {
      root: RootMenu.Apps,
      path: [{ name, gravity: 0 }],
    },
  }) as any

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
    const closeMenu = vi.fn()
    const { result } = renderHook(() =>
      useServiceAppMenu(RootMenu.Apps, closeMenu),
    )

    await act(() => result.current.handleRun('http://svc'))

    expect(closeMenu).toHaveBeenCalledTimes(1)
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

    expect(result.current.menuItems.map((i) => i.label)).toEqual(['Tools App'])
  })

  // #745: the parameter dialog belongs to the host menu, not to the menu row.
  // The row is unmounted the moment the menu closes; the dialog must not be.
  describe('service app parameter dialog', () => {
    const openDialog = (closeMenu?: () => void) => {
      act(() => {
        useAppStore.setState({
          serviceApps: { 'http://svc': serviceApp('http://svc', 'Svc') },
        })
      })
      const rendered = renderHook(() =>
        useServiceAppMenu(RootMenu.Apps, closeMenu),
      )
      const template = rendered.result.current.menuItems[0].template as any
      act(() => template.props.onSelect())
      return rendered
    }

    it('closes the menu when a row opens the dialog', () => {
      const closeMenu = vi.fn()
      const { result } = openDialog(closeMenu)

      expect(closeMenu).toHaveBeenCalledTimes(1)
      expect(getAppDialog(result.current.dialogs).props.open).toBe(true)
    })

    it('renders no parameter dialog until a row picks an app', () => {
      const { result } = renderHook(() => useServiceAppMenu(RootMenu.Apps))

      expect(getAppDialog(result.current.dialogs)).toBeNull()
    })

    it('opens the dialog for the picked app', () => {
      const { result } = openDialog()

      expect(getAppDialog(result.current.dialogs).props.app.url).toBe(
        'http://svc',
      )
    })

    it('runs the picked app when the dialog confirms', async () => {
      mockRun.mockResolvedValue({
        status: ServiceStatus.Complete,
        algorithmName: 'algo',
        message: 'ok',
      })
      const { result } = openDialog()

      await act(() =>
        getAppDialog(result.current.dialogs).props.handleConfirm(),
      )

      expect(mockRun).toHaveBeenCalledWith('http://svc')
    })

    it('drops the dialog when it closes', () => {
      const { result } = openDialog()

      act(() => getAppDialog(result.current.dialogs).props.handleClose())

      expect(getAppDialog(result.current.dialogs)).toBeNull()
    })
  })
})
