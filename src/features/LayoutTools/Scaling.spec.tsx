/**
 * The Layout Tools Scale slider (#890).
 *
 * Scaling must keep the network where it is on screen: positions scale about
 * the center of the network's bounding box, not about the coordinate origin,
 * and going back to x1.0 restores the original positions exactly.
 */
import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useViewModelStore } from '../../data/hooks/stores/ViewModelStore'
import { IdType } from '../../models/IdType'
import NetworkFn from '../../models/NetworkModel'
import ViewModelFn from '../../models/ViewModel'
import { Scaling } from './Scaling'

// Mock the database module so store persistence does not hit IndexedDB
vi.mock('../../data/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../data/db')>()
  const mocked: Record<string, any> = { ...actual }
  for (const key of Object.keys(actual)) {
    if (
      key.startsWith('put') ||
      key.startsWith('delete') ||
      key.startsWith('clear')
    ) {
      mocked[key] = vi.fn().mockResolvedValue(undefined)
    }
  }
  return mocked
})

const postEdit = vi.fn()
vi.mock('../../data/hooks/useUndoStack', () => ({
  useUndoStack: () => ({ postEdit }),
}))

const NETWORK_ID = 'scaling-net'

// Bounding box (400, 200)–(600, 400): centered at (500, 300), far from (0, 0)
const ORIGINAL: Record<IdType, [number, number]> = {
  n1: [400, 200],
  n2: [600, 400],
  n3: [450, 350],
}

const positions = (): Record<IdType, [number, number]> => {
  const view = useViewModelStore.getState().getViewModel(NETWORK_ID)
  return Object.fromEntries(
    Object.values(view?.nodeViews ?? {}).map((nv) => [nv.id, [nv.x, nv.y]]),
  )
}

const center = (record: Record<IdType, [number, number]>): [number, number] => {
  const xs = Object.values(record).map(([x]) => x)
  const ys = Object.values(record).map(([, y]) => y)
  return [
    (Math.min(...xs) + Math.max(...xs)) / 2,
    (Math.min(...ys) + Math.max(...ys)) / 2,
  ]
}

const seed = (): void => {
  const network = NetworkFn.createNetworkFromLists(
    NETWORK_ID,
    Object.keys(ORIGINAL).map((id) => ({ id })),
    [],
  )
  const view = ViewModelFn.createViewModel(network, NETWORK_ID)
  act(() => {
    useViewModelStore.getState().add(NETWORK_ID, view)
    useViewModelStore
      .getState()
      .updateNodePositions(NETWORK_ID, new Map(Object.entries(ORIGINAL)))
  })
}

/** Move the slider to `value` and release it, as the keyboard does. */
const commit = (value: number): void => {
  const input = screen.getByRole('slider') as HTMLInputElement
  act(() => {
    fireEvent.change(input, { target: { value: String(value) } })
  })
}

describe('Scaling (#890)', () => {
  beforeEach(() => {
    postEdit.mockClear()
    act(() => {
      useViewModelStore.getState().delete(NETWORK_ID)
    })
    seed()
  })

  it('keeps the network centered when it is scaled down to x0.1', () => {
    render(<Scaling networkId={NETWORK_ID} />)

    commit(-9)

    expect(center(positions())).toEqual([500, 300])
    // Each node moves to a tenth of its distance from the center
    expect(positions().n1[0]).toBeCloseTo(490)
    expect(positions().n1[1]).toBeCloseTo(290)
    expect(positions().n2[0]).toBeCloseTo(510)
    expect(positions().n2[1]).toBeCloseTo(310)
  })

  it('keeps the network centered when it is scaled up to x10', () => {
    render(<Scaling networkId={NETWORK_ID} />)

    commit(9)

    const [cx, cy] = center(positions())
    expect(cx).toBeCloseTo(500)
    expect(cy).toBeCloseTo(300)
    expect(positions().n1[0]).toBeCloseTo(-500)
    expect(positions().n2[1]).toBeCloseTo(1300)
  })

  it('restores the original positions exactly at x1.0 after x10', () => {
    render(<Scaling networkId={NETWORK_ID} />)

    commit(9)
    commit(0)

    expect(positions()).toEqual(ORIGINAL)
  })

  it('restores the original positions exactly after several scales', () => {
    render(<Scaling networkId={NETWORK_ID} />)

    for (const value of [-9, 9, -4, 3.3, -0.1, 9, 0]) {
      commit(value)
    }

    expect(positions()).toEqual(ORIGINAL)
  })

  it('scales only the x coordinates in Width mode, about the center', () => {
    render(<Scaling networkId={NETWORK_ID} />)
    fireEvent.click(screen.getByLabelText('Width'))

    commit(-9)

    expect(positions().n1[0]).toBeCloseTo(490)
    expect(positions().n2[0]).toBeCloseTo(510)
    expect(positions().n1[1]).toBe(200)
    expect(positions().n2[1]).toBe(400)
  })

  it('scales only the y coordinates in Height mode, about the center', () => {
    render(<Scaling networkId={NETWORK_ID} />)
    fireEvent.click(screen.getByLabelText('Height'))

    commit(-9)

    expect(positions().n1[0]).toBe(400)
    expect(positions().n2[0]).toBe(600)
    expect(positions().n1[1]).toBeCloseTo(290)
    expect(positions().n2[1]).toBeCloseTo(310)
  })

  it('scales a node moved while scaled about the same center', () => {
    render(<Scaling networkId={NETWORK_ID} />)
    commit(9)

    // Another component (e.g. a drag) moves one node while at x10
    act(() => {
      useViewModelStore
        .getState()
        .updateNodePositions(NETWORK_ID, new Map([['n3', [1500, 300]]]))
    })
    commit(0)

    // The moved node lands a tenth of its new distance from the center
    expect(positions().n3[0]).toBeCloseTo(600)
    expect(positions().n3[1]).toBeCloseTo(300)
    // The others are back where they started
    expect(positions().n1).toEqual(ORIGINAL.n1)
    expect(positions().n2).toEqual(ORIGINAL.n2)
  })

  it('labels the value with enough precision to tell x0.99 from x1.0', () => {
    const { container } = render(<Scaling networkId={NETWORK_ID} />)
    const label = (): string | null | undefined =>
      container.querySelector('.MuiSlider-valueLabelLabel')?.textContent

    commit(-0.1)
    expect(label()).toBe('x0.99')

    commit(0)
    expect(label()).toBe('x1.0')
  })
})
