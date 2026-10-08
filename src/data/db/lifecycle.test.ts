import { describe, expect, it } from 'vitest'

import { DELETE_TIMEOUT_MS } from './index'
import { PEER_CLOSE_GRACE_MS, RESET_COMPLETE_TIMEOUT_MS } from './lifecycle'

describe('database reset timeouts', () => {
  /**
   * The peer fallback reload exists for a deleter that died mid-reset. If it can
   * fire while the deleter is still working, peers reload into a delete that has
   * not finished — they then sit on a blank boot waiting for it, and the reset
   * looks like a hang from both sides. `RESET_COMPLETE_TIMEOUT_MS` is a literal
   * (see lifecycle.ts), so nothing but this test keeps the two in step.
   */
  it('lets the deleter finish before a peer gives up on it', () => {
    expect(RESET_COMPLETE_TIMEOUT_MS).toBeGreaterThan(
      PEER_CLOSE_GRACE_MS + DELETE_TIMEOUT_MS,
    )
  })
})
