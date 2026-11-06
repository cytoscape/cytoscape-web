import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Network } from '../../models/NetworkModel'
import { Renderer } from '../../models/RendererModel/Renderer'
import { NetworkTabs } from './NetworkTabs'

const boxSizes: ({ w: number; h: number } | undefined)[] = []
vi.mock('./NetworkTab', () => ({
  NetworkTab: ({ boxSize }: { boxSize?: { w: number; h: number } }) => {
    boxSizes.push(boxSize)
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

describe('NetworkTabs', () => {
  let box = { width: 0, height: 0 }

  beforeEach(() => {
    boxSizes.length = 0
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
})
