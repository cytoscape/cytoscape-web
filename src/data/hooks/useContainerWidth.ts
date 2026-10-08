import { RefObject, useEffect, useState } from 'react'

/**
 * Hook that tracks the rendered width of a container element.
 *
 * Unlike `useWindowSize`, this follows layout changes that never fire a
 * window `resize` event — e.g. an Allotment pane (such as the right side
 * panel) opening, closing, or being dragged. Components that must fit
 * their pane (like the Table Browser's data grids) need this width, not
 * the window's.
 *
 * @param ref - Ref to the element to measure
 * @returns The element's current width in pixels, or 0 before the first
 *          measurement (i.e. while `ref.current` is still null)
 */
export const useContainerWidth = (
  ref: RefObject<HTMLElement | null>,
): number => {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (element == null) {
      return
    }

    setWidth(element.getBoundingClientRect().width)

    if (typeof ResizeObserver === 'undefined') {
      return
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[entries.length - 1]
      if (entry !== undefined) {
        setWidth(entry.contentRect.width)
      }
    })
    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [ref])

  return width
}
