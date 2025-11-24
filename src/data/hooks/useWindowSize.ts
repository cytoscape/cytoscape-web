import { useEffect, useState } from 'react'

interface WindowSize {
  width: number
  height: number
}

/**
 * Hook that tracks the window inner dimensions and updates on resize
 * @returns The current window inner width and height in pixels
 */
export const useWindowSize = (): WindowSize => {
  const [size, setSize] = useState<WindowSize>(() => {
    // Initialize with actual values, with SSR safety
    if (typeof window === 'undefined') {
      return { width: 0, height: 0 }
    }
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    }
  })

  useEffect(() => {
    const handleResize = (): void => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return size
}

