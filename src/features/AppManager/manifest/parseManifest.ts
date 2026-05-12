import { z } from 'zod'

import { logApp } from '../../../debug'
import { AppCatalogEntry } from '../../../models/AppModel/AppCatalogEntry'

const JS_IDENTIFIER_PATTERN = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/

const AppManifestEntrySchema = z
  .object({
    id: z
      .string()
      .regex(JS_IDENTIFIER_PATTERN)
      .optional(),
    name: z.string().min(1).optional(),
    url: z.string().url(),
    author: z.string().min(1).optional().default('unknown'),
    description: z.string().optional(),
    version: z.string().optional(),
    tags: z.array(z.string()).optional(),
    icon: z.string().url().optional(),
    license: z.string().optional(),
    repository: z.string().url().optional(),
    compatibleHostVersions: z.string().optional(),
    dependencies: z.array(z.string()).optional(),
  })
  .refine((entry) => entry.id !== undefined || entry.name !== undefined, {
    message: 'Either id or name must be present',
  })

export const AppManifestSchema = z.array(AppManifestEntrySchema)

/**
 * Parse and validate a raw manifest payload into normalized AppCatalogEntry[].
 *
 * - Validates each entry independently; invalid entries are skipped with a warning
 * - If `id` is absent, `name` is used as `id` (must match JS identifier pattern)
 * - Deduplicates by `id` (first occurrence wins)
 * - Warns on self-referencing or unknown dependencies (no runtime enforcement)
 */
export function parseManifest(data: unknown): AppCatalogEntry[] {
  if (!Array.isArray(data)) {
    logApp.warn('[parseManifest]: Manifest is not an array, returning empty catalog')
    return []
  }

  const entries: AppCatalogEntry[] = []
  const seenIds = new Set<string>()

  for (let i = 0; i < data.length; i++) {
    const result = AppManifestEntrySchema.safeParse(data[i])
    if (!result.success) {
      logApp.warn(
        `[parseManifest]: Skipping invalid entry at index ${i}:`,
        result.error.issues,
      )
      continue
    }

    const parsed = result.data

    // Resolve id: prefer explicit id, fall back to name
    let id = parsed.id
    if (id === undefined) {
      if (parsed.name !== undefined && JS_IDENTIFIER_PATTERN.test(parsed.name)) {
        id = parsed.name
      } else {
        logApp.warn(
          `[parseManifest]: Skipping entry at index ${i}: name "${parsed.name}" is not a valid identifier and no id provided`,
        )
        continue
      }
    }

    // Deduplicate
    if (seenIds.has(id)) {
      logApp.warn(
        `[parseManifest]: Duplicate id "${id}" at index ${i}, keeping first occurrence`,
      )
      continue
    }
    seenIds.add(id)

    const entry: AppCatalogEntry = {
      id,
      url: parsed.url,
      author: parsed.author,
      ...(parsed.name !== undefined && { name: parsed.name }),
      ...(parsed.description !== undefined && { description: parsed.description }),
      ...(parsed.version !== undefined && { version: parsed.version }),
      ...(parsed.tags !== undefined && { tags: parsed.tags }),
      ...(parsed.icon !== undefined && { icon: parsed.icon }),
      ...(parsed.license !== undefined && { license: parsed.license }),
      ...(parsed.repository !== undefined && { repository: parsed.repository }),
      ...(parsed.compatibleHostVersions !== undefined && {
        compatibleHostVersions: parsed.compatibleHostVersions,
      }),
      ...(parsed.dependencies !== undefined && { dependencies: parsed.dependencies }),
    }

    entries.push(entry)
  }

  // Warn on dependency issues (no runtime enforcement)
  const allIds = new Set(entries.map((e) => e.id))
  for (const entry of entries) {
    if (entry.dependencies) {
      for (const dep of entry.dependencies) {
        if (dep === entry.id) {
          logApp.warn(
            `[parseManifest]: App "${entry.id}" has self-referencing dependency`,
          )
        } else if (!allIds.has(dep)) {
          logApp.warn(
            `[parseManifest]: App "${entry.id}" depends on unknown app "${dep}"`,
          )
        }
      }
    }
  }

  return entries
}
