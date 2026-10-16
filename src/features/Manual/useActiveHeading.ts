import { useEffect, useState } from 'react'

/** Events that mean the reader moved the page themselves. */
const READER_SCROLL_EVENTS = ['wheel', 'touchmove', 'keydown'] as const

/**
 * The id of the section the reader is in: the last heading in `ids` whose top
 * has scrolled above `offset` pixels from the top of the viewport, or the
 * first heading before any has. Recomputed on scroll and resize.
 *
 * `hash` is the URL hash. After a jump to one of the headings (a section
 * link), that heading stays marked until the reader scrolls: a section near
 * the end of a page cannot reach the top, so the scroll position alone would
 * mark a later one.
 */
export const useActiveHeading = (
  ids: readonly string[],
  offset: number,
  hash: string,
): string | undefined => {
  const [active, setActive] = useState<string | undefined>()
  const key = ids.join('|')
  const jumpedTo = decodeURIComponent(hash.replace(/^#/, ''))
  const [pinned, setPinned] = useState<string | undefined>()

  useEffect(() => {
    const headingIds = key === '' ? [] : key.split('|')
    setPinned(headingIds.includes(jumpedTo) ? jumpedTo : undefined)
    const release = (): void => setPinned(undefined)
    for (const event of READER_SCROLL_EVENTS) {
      window.addEventListener(event, release, { passive: true })
    }
    return () => {
      for (const event of READER_SCROLL_EVENTS) {
        window.removeEventListener(event, release)
      }
    }
  }, [key, jumpedTo])

  useEffect(() => {
    if (key === '') {
      setActive(undefined)
      return
    }
    const headingIds = key.split('|')
    let frame = 0
    const update = (): void => {
      frame = 0
      let current = headingIds[0]
      for (const id of headingIds) {
        const element = document.getElementById(id)
        if (element === null) continue
        if (element.getBoundingClientRect().top - offset <= 0) current = id
        else break
      }
      // At the bottom of the page the last section may never reach the top.
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2
      setActive(atBottom ? headingIds[headingIds.length - 1] : current)
    }
    const schedule = (): void => {
      if (frame === 0) frame = window.requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (frame !== 0) window.cancelAnimationFrame(frame)
    }
  }, [key, offset])

  return pinned ?? active
}
