import { useEffect, useState } from 'react'

/**
 * The id of the section the reader is in: the last heading in `ids` whose top
 * has scrolled above `offset` pixels from the top of the viewport, or the
 * first heading before any has. Recomputed on scroll and resize.
 */
export const useActiveHeading = (
  ids: readonly string[],
  offset: number,
): string | undefined => {
  const [active, setActive] = useState<string | undefined>()
  const key = ids.join('|')

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

  return active
}
