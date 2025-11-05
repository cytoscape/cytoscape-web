// Unique Name Generation Utilities

/**
 * Escapes special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Generates a unique name by appending an incrementing suffix.
 *
 * Features:
 * - Extracts base name from inputs that already have suffixes (e.g., "network_2" → base "network")
 * - Finds the highest existing number for smart incrementing
 * - Handles both Array and Set for performance
 *
 * @param existingNames - Array or Set of existing names to check against
 * @param proposedName - The name to make unique
 * @returns A unique name with format: `baseName_N` where N is the next available number
 *
 * @example
 * generateUniqueName(['network'], 'network') // → 'network_1'
 * generateUniqueName(['network_2'], 'network_2') // → 'network_3' (extracts base)
 * generateUniqueName(['network_1', 'network_5'], 'network') // → 'network_6' (finds highest)
 */
export function generateUniqueName(
  existingNames: string[] | Set<string>,
  proposedName: string,
): string {
  // Normalize to array for consistent handling
  const names =
    existingNames instanceof Set ? Array.from(existingNames) : existingNames

  // Extract base name (remove existing suffix pattern like "_123")
  const baseName = proposedName.replace(/_(\d+)$/, '') || proposedName

  // Check if the exact proposed name exists
  const exactMatch = names.includes(proposedName)

  // Find highest existing number for this base name
  let maxNum = 0
  const pattern = new RegExp(`^${escapeRegex(baseName)}_(\\d+)$`)

  for (const name of names) {
    const match = name.match(pattern)
    if (match) {
      const num = parseInt(match[1], 10)
      maxNum = Math.max(maxNum, num)
    }
  }

  // If exact name exists or numbered versions exist, we need to generate a new name
  if (exactMatch || maxNum > 0) {
    // Generate next unique name starting from maxNum + 1
    let i = maxNum + 1
    let candidate = `${baseName}_${i}`
    while (names.includes(candidate)) {
      i++
      candidate = `${baseName}_${i}`
    }
    return candidate
  }

  // No exact match and no numbered versions exist, return as-is
  return proposedName
}
