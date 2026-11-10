import { RefObject, useEffect, useState } from 'react'

export interface ContainerSize {
  readonly w: number
  readonly h: number
}

const NOT_MEASURED: ContainerSize = { w: 0, h: 0 }

/**
 * Hook that tracks the rendered size of a container element.
 *
 * The size follows the element, so a container that is 0 x 0 or mid-layout when
 * it mounts (Allotment panes, a panel that opens later) still reports its real
 * size once it has one. A 0 x 0 reading is ignored: the element is hidden or
 * not laid out yet, and the last real size stays the useful one.
 *
 * The returned object changes only when the size does, so it is safe to use as
 * an effect dependency, but it does change on every frame of a pane drag. Do
 * not start expensive work from it directly.
 *
 * @param ref - Ref to the element to measure
 * @returns The element's last non-zero size in pixels, or 0 x 0 until it has one
 */
export const useContainerSize = (
  ref: RefObject<HTMLElement | null>,
): ContainerSize => {
  const [size, setSize] = useState<ContainerSize>(NOT_MEASURED)

  useEffect(() => {
    const element = ref.current
    if (element == null) {
      return
    }

    const measure = (): void => {
      const { width, height } = element.getBoundingClientRect()
      if (width === 0 || height === 0) {
        return
      }
      setSize((previous) =>
        previous.w === width && previous.h === height
          ? previous
          : { w: width, h: height },
      )
    }

    measure()

    if (typeof ResizeObserver === 'undefined') {
      return
    }

    const observer = new ResizeObserver(measure)
    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [ref])

  return size
}
