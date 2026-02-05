import { waitSeconds } from './waitSeconds'

describe('waitSeconds', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('should return a Promise', () => {
    const promise = waitSeconds(1)
    expect(promise).toBeInstanceOf(Promise)
  })

  it('should resolve after the specified number of seconds', async () => {
    const promise = waitSeconds(1)
    let resolved = false

    promise.then(() => {
      resolved = true
    })

    // Initially not resolved
    expect(resolved).toBe(false)

    // Fast-forward 1 second
    jest.advanceTimersByTime(1000)

    // Wait for promise to resolve using flushPromises pattern
    await Promise.resolve()
    expect(resolved).toBe(true)
  })

  it.each([
    [0.5, 500],
    [1, 1000],
    [2, 2000],
    [5, 5000],
  ])(
    'should wait %s seconds (%s milliseconds)',
    async (seconds, milliseconds) => {
      const promise = waitSeconds(seconds)
      let resolved = false

      promise.then(() => {
        resolved = true
      })

      expect(resolved).toBe(false)

      // Fast-forward the exact amount
      jest.advanceTimersByTime(milliseconds)

      // Allow promise to resolve
      await Promise.resolve()
      expect(resolved).toBe(true)
    },
  )

  it('should handle fractional seconds correctly', async () => {
    const promise = waitSeconds(0.2)
    let resolved = false

    promise.then(() => {
      resolved = true
    })

    expect(resolved).toBe(false)

    // Fast-forward 200ms
    jest.advanceTimersByTime(200)

    await Promise.resolve()
    expect(resolved).toBe(true)
  })

  it('should handle zero seconds', async () => {
    const promise = waitSeconds(0)
    let resolved = false

    promise.then(() => {
      resolved = true
    })

    // Should resolve immediately (0ms)
    jest.advanceTimersByTime(0)

    await Promise.resolve()
    expect(resolved).toBe(true)
  })

  it('should not resolve before the specified time', async () => {
    const promise = waitSeconds(2)
    let resolved = false

    promise.then(() => {
      resolved = true
    })

    // Fast-forward only 1 second
    jest.advanceTimersByTime(1000)

    // Allow any pending promises to process
    await Promise.resolve()

    // Promise should not have resolved yet
    expect(resolved).toBe(false)

    // Now fast-forward the remaining second
    jest.advanceTimersByTime(1000)
    await Promise.resolve()
    expect(resolved).toBe(true)
  })

  it('should resolve with correct timing for different delays', async () => {
    const results: number[] = []

    waitSeconds(0.1).then(() => results.push(1))
    waitSeconds(0.2).then(() => results.push(2))
    waitSeconds(0.3).then(() => results.push(3))

    // Advance by 100ms - only first should resolve
    jest.advanceTimersByTime(100)
    await Promise.resolve()
    expect(results).toEqual([1])

    // Advance by another 100ms - second should resolve
    jest.advanceTimersByTime(100)
    await Promise.resolve()
    expect(results).toEqual([1, 2])

    // Advance by another 100ms - third should resolve
    jest.advanceTimersByTime(100)
    await Promise.resolve()
    expect(results).toEqual([1, 2, 3])
  })
})
