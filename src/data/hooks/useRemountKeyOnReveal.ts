import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * Returns a key that changes after this subtree is hidden and revealed by a
 * suspended ancestor <Suspense> boundary.
 *
 * When a boundary re-suspends after its content has mounted, React 18 hides
 * the content and destroys its effects, then re-runs them on reveal — without
 * remounting the components, so state and refs survive. Libraries that build
 * imperative structures in a mount effect come back from that cycle reset,
 * while their ref-held bookkeeping still describes the old structure.
 *
 * allotment 1.18.1 is such a library: its split view is recreated empty on
 * reveal, but the previous-keys ref it diffs children against survives, so
 * the next conditional <Allotment.Pane> unmount calls removeView with an
 * index past the end of the empty view list and throws "Index out of bounds"
 * (crashed the workspace editor after the whole shell was suspended by a
 * lazy app component). Key the fragile subtree with this value so a reveal
 * remounts it from scratch instead.
 */
export const useRemountKeyOnReveal = (): number => {
  const [remountKey, setRemountKey] = useState(0)
  const attachedOnceRef = useRef(false)
  // Settled only via a microtask queued from the passive effect: StrictMode's
  // dev-only replay (destroy + re-create of every effect) runs synchronously
  // inside the same flush as the first passive effects, so its re-created
  // layout effect still sees an unsettled mount and does not bump the key.
  // A real Suspense hide/reveal happens in later, separate commits — long
  // after the microtask ran.
  const mountSettledRef = useRef(false)

  useLayoutEffect(() => {
    if (attachedOnceRef.current && mountSettledRef.current) {
      // Layout effects re-attached on a component that already mounted:
      // an ancestor Suspense boundary hid and revealed this subtree.
      setRemountKey((key) => key + 1)
    }
    attachedOnceRef.current = true
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      mountSettledRef.current = true
    })
  }, [])

  return remountKey
}
