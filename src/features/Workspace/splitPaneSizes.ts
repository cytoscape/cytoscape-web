/**
 * Reads the workspace's vertical split sizes out of an allotment `onChange`.
 *
 * allotment emits the size of every view it currently holds, and its
 * `addView` relayouts after each pane it adds — so while the split is being
 * built (first mount, and every `useRemountKeyOnReveal` remount) `onChange`
 * fires with a single size. Treating that as `[top, bottom]` hands
 * `undefined` to the Table Browser as its height, which it turns into `NaN`.
 *
 * Returns `undefined` unless the emit holds exactly two finite sizes; callers
 * keep their previous sizes in that case.
 */
export const toVerticalPaneSizes = (
  sizes: readonly number[],
): [number, number] | undefined => {
  if (sizes.length !== 2) return undefined
  const [top, bottom] = sizes
  if (!Number.isFinite(top) || !Number.isFinite(bottom)) return undefined
  return [top, bottom]
}
