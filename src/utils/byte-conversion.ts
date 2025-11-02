/**
 * Formats a number of bytes into a human-readable string with binary units (IEC 80000-13).
 *
 * Converts bytes to the largest appropriate binary unit (KiB, MiB, GiB, etc.) using base 1024.
 * Uses binary prefixes (IEC standard) rather than decimal prefixes (SI standard).
 *
 * @param bytes - The number of bytes to format. Must be >= 0.
 * @param decimals - The number of decimal places to show (default: 2).
 * @returns A formatted string with the size and appropriate unit (e.g., "1.5 MiB", "512 Bytes").
 *
 * @example
 * ```ts
 * formatBytes(0)                    // "0 Bytes"
 * formatBytes(512)                  // "512 Bytes"
 * formatBytes(1024)                 // "1 KiB"
 * formatBytes(1048576)               // "1 MiB"
 * formatBytes(1536000)               // "1.46 MiB"
 * formatBytes(1536000, 3)           // "1.465 MiB"
 * formatBytes(1099511627776)         // "1 TiB"
 * ```
 *
 * @remarks
 * - Uses binary prefixes (KiB, MiB, GiB) where 1 KiB = 1024 bytes
 * - Maximum supported size is approximately 2^80 bytes (1 YiB)
 * - For values >= 1024^9 (YiB), the result will use the largest available unit
 * - For zero bytes, returns "0 Bytes"
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) {
    return '0 Bytes'
  }

  if (bytes < 0) {
    // Handle negative values (though they don't make sense for bytes)
    bytes = Math.abs(bytes)
  }

  const k = 1024

  const sizes = [
    'Bytes',
    'KiB',
    'MiB',
    'GiB',
    'TiB',
    'PiB',
    'EiB',
    'ZiB',
    'YiB',
  ]

  // For values < 1 byte, always return in Bytes
  if (bytes < 1) {
    return `${bytes.toFixed(decimals)} Bytes`
  }

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  // Clamp index to valid array bounds to handle very large values and ensure >= 0
  const index = Math.max(0, Math.min(i, sizes.length - 1))

  return `${parseFloat((bytes / Math.pow(k, index)).toFixed(decimals))} ${sizes[index]}`
}
