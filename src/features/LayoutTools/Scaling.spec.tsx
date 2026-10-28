/**
 * The Layout Tools Scale slider (#890).
 *
 * Scaling must keep the network where it is on screen: positions scale about
 * the center of the network's bounding box, not about the coordinate origin,
 * and going back to x1.0 restores the original positions exactly.
 */
import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useLayoutStore } from '../../data/hooks/stores/LayoutStore'
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

const seed = (
  original: Record<IdType, [number, number, number?]> = ORIGINAL,
): void => {
  const network = NetworkFn.createNetworkFromLists(
    NETWORK_ID,
    Object.keys(original).map((id) => ({ id })),
    [],
  )
  const view = ViewModelFn.createViewModel(network, NETWORK_ID)
  act(() => {
    useViewModelStore.getState().add(NETWORK_ID, view)
    useViewModelStore
      .getState()
      .updateNodePositions(NETWORK_ID, new Map(Object.entries(original)))
  })
}

/** Move the slider to `value` and release it, as the keyboard does. */
const commit = (value: number, index = 0): void => {
  const input = screen.getAllByRole('slider')[index] as HTMLInputElement
  act(() => {
    fireEvent.change(input, { target: { value: String(value) } })
  })
}

/** The value the slider shows, e.g. '9' for x10. */
const sliderValue = (index = 0): string =>
  (screen.getAllByRole('slider')[index] as HTMLInputElement).value

/**
 * Undo or redo the `index`-th posted scale the way useUndoStack replays an
 * APPLY_LAYOUT entry: write its stored positions back to the view model.
 */
const replay = (index: number, direction: 'undo' | 'redo'): void => {
  const [, , undoParams, redoParams] = postEdit.mock.calls[index]
  const [networkId, entryPositions] =
    direction === 'undo' ? undoParams : redoParams
  act(() => {
    useViewModelStore.getState().updateNodePositions(networkId, entryPositions)
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

  it('rebases to x1.0 when a node is moved by hand while scaled (#896)', () => {
    render(<Scaling networkId={NETWORK_ID} />)
    commit(9)

    // Another component (e.g. a drag) moves one node while at x10
    act(() => {
      useViewModelStore
        .getState()
        .updateNodePositions(NETWORK_ID, new Map([['n3', [1500, 300]]]))
    })
    const moved = positions()

    // What is on screen is the new x1.0: the slider says so, and x1.0
    // leaves every node where it is
    expect(sliderValue()).toBe('0')
    commit(0)
    expect(positions()).toEqual(moved)
  })

  it('scales about the remaining nodes after a node is deleted', () => {
    render(<Scaling networkId={NETWORK_ID} />)
    commit(9)

    // n2 sets the far corner of the bounding box
    act(() => {
      useViewModelStore.getState().deleteObjects(NETWORK_ID, ['n2'])
    })
    commit(0)
    commit(-9)

    // n1 (400, 200) and n3 (450, 350) are centered at (425, 275)
    const [cx, cy] = center(positions())
    expect(cx).toBeCloseTo(425)
    expect(cy).toBeCloseTo(275)
    expect(Object.keys(positions()).sort()).toEqual(['n1', 'n3'])
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

describe('Scaling with no node positions (#880)', () => {
  const EMPTY_ID = 'scaling-empty-net'

  beforeEach(() => {
    postEdit.mockClear()
    act(() => {
      useViewModelStore.getState().delete(EMPTY_ID)
      useLayoutStore.getState().setIsRunning(false)
    })
  })

  it('does not leave "Applying layout..." on for a network with no nodes', () => {
    const network = NetworkFn.createNetworkFromLists(EMPTY_ID, [], [])
    act(() => {
      useViewModelStore
        .getState()
        .add(EMPTY_ID, ViewModelFn.createViewModel(network, EMPTY_ID))
    })
    render(<Scaling networkId={EMPTY_ID} />)

    commit(9)

    expect(useLayoutStore.getState().isRunning).toBe(false)
    expect(postEdit).not.toHaveBeenCalled()
  })

  it('does not leave "Applying layout..." on before the view exists', () => {
    render(<Scaling networkId={EMPTY_ID} />)

    commit(9)

    expect(useLayoutStore.getState().isRunning).toBe(false)
    expect(postEdit).not.toHaveBeenCalled()
  })

  it('clears "Applying layout..." after scaling a network', () => {
    act(() => {
      useViewModelStore.getState().delete(NETWORK_ID)
    })
    seed()
    render(<Scaling networkId={NETWORK_ID} />)

    commit(9)

    expect(useLayoutStore.getState().isRunning).toBe(false)
    expect(postEdit).toHaveBeenCalledTimes(1)
  })

  const expectControlsDisabled = (disabled: boolean): void => {
    expect((screen.getByRole('slider') as HTMLInputElement).disabled).toBe(
      disabled,
    )
    for (const label of ['Width', 'Height', 'Both']) {
      expect((screen.getByLabelText(label) as HTMLInputElement).disabled).toBe(
        disabled,
      )
    }
    expect(
      (screen.getByTestId('scaling-reset-button') as HTMLButtonElement)
        .disabled,
    ).toBe(disabled)
  }

  it('disables the controls for a network with no nodes', () => {
    const network = NetworkFn.createNetworkFromLists(EMPTY_ID, [], [])
    act(() => {
      useViewModelStore
        .getState()
        .add(EMPTY_ID, ViewModelFn.createViewModel(network, EMPTY_ID))
    })
    render(<Scaling networkId={EMPTY_ID} />)

    expectControlsDisabled(true)
  })

  it('disables the controls before the view exists', () => {
    render(<Scaling networkId={EMPTY_ID} />)

    expectControlsDisabled(true)
  })

  it('enables the controls once the network view has nodes', () => {
    render(<Scaling networkId={NETWORK_ID} />)
    act(() => {
      useViewModelStore.getState().delete(NETWORK_ID)
    })
    expectControlsDisabled(true)

    seed()

    expectControlsDisabled(false)
  })
})

describe('Scaling after undo and redo (#896)', () => {
  beforeEach(() => {
    postEdit.mockClear()
    act(() => {
      useViewModelStore.getState().delete(NETWORK_ID)
    })
    seed()
  })

  it('shows x1.0 after undoing x10, and x1.0 then changes nothing', () => {
    render(<Scaling networkId={NETWORK_ID} />)

    commit(9)
    replay(0, 'undo')

    expect(positions()).toEqual(ORIGINAL)
    expect(sliderValue()).toBe('0')

    // Before the fix, x1.0 shrank the network to a tenth about its center
    commit(0)
    expect(positions()).toEqual(ORIGINAL)
  })

  it('scales from the restored layout after an undo', () => {
    render(<Scaling networkId={NETWORK_ID} />)

    commit(9)
    replay(0, 'undo')
    commit(9)

    // A real change, not an entry that moves nothing
    const [, , [, before], [, after]] = postEdit.mock.calls[1]
    expect(after).not.toEqual(before)
    expect(positions().n1[0]).toBeCloseTo(-500)
    expect(positions().n2[1]).toBeCloseTo(1300)
  })

  it('shows x10 again after redo, and x1.0 then restores the original', () => {
    render(<Scaling networkId={NETWORK_ID} />)

    commit(9)
    replay(0, 'undo')
    replay(0, 'redo')

    expect(sliderValue()).toBe('9')
    commit(0)
    expect(positions()).toEqual(ORIGINAL)
  })

  it('shows the earlier value when one of several scales is undone', () => {
    render(<Scaling networkId={NETWORK_ID} />)

    commit(1) // x2
    commit(9) // x10
    replay(1, 'undo')

    expect(sliderValue()).toBe('1')
    commit(0)
    expect(positions()).toEqual(ORIGINAL)
  })

  it('reads a redone Width scale as Width even with Both selected', () => {
    render(<Scaling networkId={NETWORK_ID} />)
    fireEvent.click(screen.getByLabelText('Width'))

    commit(9)
    replay(0, 'undo')
    fireEvent.click(screen.getByLabelText('Both'))
    replay(0, 'redo')

    expect(sliderValue()).toBe('9')
    expect((screen.getByLabelText('Width') as HTMLInputElement).checked).toBe(
      true,
    )
    commit(0)
    expect(positions()).toEqual(ORIGINAL)
  })

  it('keeps a newly selected mode when a write leaves every node in place', () => {
    render(<Scaling networkId={NETWORK_ID} />)
    commit(9)
    fireEvent.click(screen.getByLabelText('Width'))

    // A new nodeViews object with the same coordinates: nothing moved, so
    // the slider must not reread the Both x10 layout and undo the choice
    act(() => {
      useViewModelStore
        .getState()
        .updateNodePositions(NETWORK_ID, new Map(Object.entries(positions())))
    })

    expect((screen.getByLabelText('Width') as HTMLInputElement).checked).toBe(
      true,
    )
    expect(sliderValue()).toBe('9')
    // The next commit scales the width only
    commit(4) // x5
    expect(positions().n1[0]).toBeCloseTo(0)
    expect(positions().n1[1]).toBe(ORIGINAL.n1[1])
    expect(positions().n2[1]).toBe(ORIGINAL.n2[1])
  })

  it('rebases to x1.0 when a new layout replaces the scaled one', () => {
    render(<Scaling networkId={NETWORK_ID} />)
    commit(9)

    const layout = new Map<IdType, [number, number]>([
      ['n1', [0, 0]],
      ['n2', [100, 0]],
      ['n3', [0, 300]],
    ])
    act(() => {
      useViewModelStore.getState().updateNodePositions(NETWORK_ID, layout)
    })

    expect(sliderValue()).toBe('0')
    commit(0)
    expect(positions()).toEqual(Object.fromEntries(layout))
  })

  it('reads the value back for a layout under one unit across', () => {
    act(() => {
      useViewModelStore.getState().delete(NETWORK_ID)
    })
    // Centered at (0.5, 0.5): every node is half a unit from the anchor
    const compact: Record<IdType, [number, number]> = {
      n1: [0, 0],
      n2: [1, 1],
    }
    seed(compact)
    render(<Scaling networkId={NETWORK_ID} />)

    commit(1) // x2
    commit(9) // x10
    replay(1, 'undo')

    expect(sliderValue()).toBe('1')
    commit(0)
    expect(positions()).toEqual(compact)
  })

  it('reads the value back from z when every node shares x and y', () => {
    act(() => {
      useViewModelStore.getState().delete(NETWORK_ID)
    })
    const stacked: Record<IdType, [number, number, number]> = {
      n1: [0, 0, 5],
      n2: [0, 0, 10],
    }
    seed(stacked)
    render(<Scaling networkId={NETWORK_ID} />)
    const zs = (): number[] =>
      ['n1', 'n2'].map(
        (id) =>
          useViewModelStore.getState().getViewModel(NETWORK_ID)!.nodeViews[id]
            .z as number,
      )

    commit(1) // x2
    commit(9) // x10
    replay(1, 'undo')

    expect(sliderValue()).toBe('1')
    commit(0)
    expect(zs()).toEqual([5, 10])
  })

  it('keeps two mounted sliders on one network in step', () => {
    render(
      <>
        <Scaling networkId={NETWORK_ID} />
        <Scaling networkId={NETWORK_ID} />
      </>,
    )

    commit(9, 0)
    expect(sliderValue(1)).toBe('9')

    replay(0, 'undo')
    expect(sliderValue(0)).toBe('0')
    expect(sliderValue(1)).toBe('0')

    commit(4, 1) // x5 from the second slider
    expect(sliderValue(0)).toBe('4')
    commit(0, 0)
    expect(positions()).toEqual(ORIGINAL)
  })
})
