import { act, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useUiStateStore } from '../../data/hooks/stores/UiStateStore'
import { Network } from '../../models/NetworkModel'
import { Renderer } from '../../models/RendererModel/Renderer'
import { NetworkTabs } from './NetworkTabs'

const boxSizes: ({ w: number; h: number } | undefined)[] = []
const selectedByRenderer = new Map<string, boolean>()
vi.mock('./NetworkTab', () => ({
  NetworkTab: ({
    boxSize,
    renderer,
    selected,
  }: {
    boxSize?: { w: number; h: number }
    renderer: { id: string }
    selected: boolean
  }) => {
    boxSizes.push(boxSize)
    selectedByRenderer.set(renderer.id, selected)
    return null
  },
}))

// jsdom has no ResizeObserver and does no layout
class FakeResizeObserver {
  static instances: FakeResizeObserver[] = []
  private readonly targets: Element[] = []

  constructor(private readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this)
  }

  observes(target: Element): boolean {
    return this.targets.includes(target)
  }

  observe(target: Element): void {
    this.targets.push(target)
  }
  unobserve(): void {}
  disconnect(): void {}

  trigger(): void {
    this.callback([], this as unknown as ResizeObserver)
  }
}

const CONTENT_TEST_ID = 'network-tabs-content'

const renderer = { id: 'r', name: 'R', getComponent: vi.fn() } as Renderer
const cellView = { id: 'c', name: 'C', getComponent: vi.fn() } as Renderer

describe('NetworkTabs', () => {
  let box = { width: 0, height: 0 }

  beforeEach(() => {
    boxSizes.length = 0
    selectedByRenderer.clear()
    FakeResizeObserver.instances = []
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: Element) {
        const isContent = this.getAttribute('data-testid') === CONTENT_TEST_ID
        return {
          left: 0,
          top: 0,
          right: isContent ? box.width : 0,
          bottom: isContent ? box.height : 0,
          width: isContent ? box.width : 0,
          height: isContent ? box.height : 0,
        } as DOMRect
      },
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  // After a reload the box can still be 0 x 0 when it mounts. It used to be
  // measured once, so the renderers never got a size and the Cell View stayed
  // blank.
  it('hands the renderers the size of a box that was 0 x 0 at mount', () => {
    box = { width: 0, height: 0 }
    const { getByTestId } = render(
      <NetworkTabs
        network={{ id: 'n' } as Network}
        views={[]}
        renderers={{ r: renderer }}
        isActive
      />,
    )
    expect(boxSizes.at(-1)).toEqual({ w: 0, h: 0 })

    box = { width: 422, height: 699 }
    act(() => {
      FakeResizeObserver.instances
        .filter((observer) => observer.observes(getByTestId(CONTENT_TEST_ID)))
        .forEach((observer) => observer.trigger())
    })

    expect(boxSizes.at(-1)).toEqual({ w: 422, h: 699 })
  })

  // An index from `?activeNetworkViewTab=` is not checked against the tabs at
  // boot, so one past the last tab, or a fraction, used to select no renderer
  // and leave the panel blank (#995).
  it.each([5, 1.5])(
    'shows the first renderer when the stored tab index is %s',
    (index) => {
      act(() => {
        useUiStateStore.getState().setNetworkViewTabIndex(index)
      })
      const { getAllByRole } = render(
        <NetworkTabs
          network={{ id: 'n' } as Network}
          views={[]}
          renderers={{ r: renderer, c: cellView }}
          isActive
        />,
      )

      expect(selectedByRenderer.get('r')).toBe(true)
      expect(selectedByRenderer.get('c')).toBe(false)
      expect(getAllByRole('tab')[0].getAttribute('aria-selected')).toBe('true')
    },
  )

  // The fallback only changes what is shown. A renderer that is briefly
  // missing must not cost the user the tab they had chosen.
  it('leaves the stored tab index alone while it shows the fallback tab', () => {
    act(() => {
      useUiStateStore.getState().setNetworkViewTabIndex(1)
    })
    render(
      <NetworkTabs
        network={{ id: 'n' } as Network}
        views={[]}
        renderers={{ r: renderer }}
        isActive
      />,
    )

    expect(selectedByRenderer.get('r')).toBe(true)
    expect(useUiStateStore.getState().ui.networkViewUi.activeTabIndex).toBe(1)
  })

  // MUI skips `onChange` for the tab it already shows as selected, so a click
  // on the fallback tab used to leave the stale index in the store, and the
  // panel jumped back to it once that tab existed again.
  it('stores the index of the fallback tab when the user clicks it', () => {
    act(() => {
      useUiStateStore.getState().setNetworkViewTabIndex(1)
    })
    const handleClick = vi.fn()
    const props = {
      network: { id: 'n' } as Network,
      views: [],
      isActive: true,
      handleClick,
    }
    const { getAllByRole, rerender } = render(
      <NetworkTabs {...props} renderers={{ r: renderer }} />,
    )

    fireEvent.click(getAllByRole('tab')[0])

    expect(handleClick).toHaveBeenCalled()
    expect(useUiStateStore.getState().ui.networkViewUi.activeTabIndex).toBe(0)

    rerender(
      <NetworkTabs {...props} renderers={{ r: renderer, c: cellView }} />,
    )
    expect(selectedByRenderer.get('r')).toBe(true)
    expect(selectedByRenderer.get('c')).toBe(false)
  })
})
