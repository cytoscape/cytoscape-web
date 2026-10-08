// URL flags for the boot path, captured at module load.
//
// This must be evaluated before AppShell's init effect calls navigate() with
// `search: ''`, which strips every search param from the URL (the URL-as-state
// pattern — see ROUTING_SPECIFICATION.md). Anything that reads
// window.location.search *after* that point sees nothing, which is why the
// value is snapshotted here rather than read on demand.
//
// showBootShell imports this so the capture lands in the very first chunk to
// execute, long before the router exists.

const readFlag = (name: string): boolean => {
  try {
    return new URLSearchParams(window.location.search).has(name)
  } catch {
    return false
  }
}

/** `?bootReport` — render the boot timing overlay once the boot completes. */
export const BOOT_REPORT_REQUESTED = readFlag('bootReport')
