import { z } from 'zod'

import { logApi } from '../../../../debug'
import { FilterWidgetType } from '../../../../models/FilterModel'
import { GraphObjectType } from '../../../../models/NetworkModel'
import {
  FILTER_ASPECT_TAG,
  FilterAspect,
  FilterAspects,
} from '../FilterAspects'

/**
 * Runtime validation for the `filterWidgets` opaque aspect of a Hierarchy
 * Viewer interaction network (#767).
 *
 * The format has no published specification; `FilterAspect` is its only
 * definition. Real data (e.g. the MuSIC interaction networks) spells values
 * differently from the enums the app compares against:
 *
 * - `appliesTo` / `filterMode` are `"edges"` / `"edge"` (and presumably
 *   `"nodes"` / `"node"`), normalized to `GraphObjectType`.
 * - `widgetType` is `"checkboxes"`, normalized to `FilterWidgetType.CHECKBOX`.
 *   Checkboxes are the only widget the Hierarchy Viewer builds from this
 *   aspect, so any other widget type is rejected.
 *
 * Matching is case-insensitive. `z.object` copies only the declared keys into
 * a fresh object, so `__proto__` / `constructor` keys in the input never reach
 * the output. Attribute names that would resolve to inherited members of a
 * table row (`row['constructor']`) are rejected.
 */

const normalizedString = z
  .string()
  .transform((value: string) => value.trim().toLowerCase())

const GraphObjectTypeSchema = normalizedString.pipe(
  z
    .enum(['node', 'nodes', 'edge', 'edges'])
    .transform(
      (value): GraphObjectType =>
        value.startsWith('node') ? GraphObjectType.NODE : GraphObjectType.EDGE,
    ),
)

const WidgetTypeSchema = normalizedString.pipe(
  z
    .enum(['checkbox', 'checkboxes'])
    .transform((): FilterWidgetType => FilterWidgetType.CHECKBOX),
)

const RESERVED_ATTRIBUTE_NAMES: ReadonlySet<string> = new Set([
  '__proto__',
  'constructor',
  'prototype',
])

const AttributeNameSchema = z
  .string()
  .min(1)
  .refine((name: string) => !RESERVED_ATTRIBUTE_NAMES.has(name), {
    message: 'Reserved attribute name',
  })

const DiscreteFilterDetailsSchema = z
  .object({
    predicate: z.string(),
    criterion: z.string(),
    description: z.string().optional(),
    tooltip: z.string().optional(),
  })
  .transform((details) => ({
    predicate: details.predicate,
    criterion: details.criterion,
    description: details.description ?? details.criterion,
    tooltip: details.tooltip ?? '',
  }))

export const FilterAspectSchema = z
  .object({
    widgetType: WidgetTypeSchema.optional(),
    filterMode: GraphObjectTypeSchema.optional(),
    appliesTo: GraphObjectTypeSchema,
    attributeName: AttributeNameSchema,
    label: z.string().optional(),
    filter: z.array(DiscreteFilterDetailsSchema),
    mappingSource: z.string().optional(),
  })
  .transform(
    (aspect): FilterAspect => ({
      widgetType: aspect.widgetType ?? FilterWidgetType.CHECKBOX,
      filterMode: aspect.filterMode ?? aspect.appliesTo,
      appliesTo: aspect.appliesTo,
      attributeName: aspect.attributeName,
      label: aspect.label ?? aspect.attributeName,
      filter: aspect.filter,
      mappingSource: aspect.mappingSource ?? '',
    }),
  )

/**
 * Validate and normalize the raw value of the `filterWidgets` aspect.
 *
 * Never throws: a value that is not an array yields no aspects, and invalid
 * entries are dropped, each with a warning. A bad filter must not take down
 * the subnetwork view it belongs to.
 *
 * @param value The untrusted aspect value from the CX2 document
 * @returns The valid entries, normalized
 */
export const parseFilterAspects = (value: unknown): FilterAspects => {
  if (!Array.isArray(value)) {
    logApi.warn(
      `[parseFilterAspects]: Ignoring the '${FILTER_ASPECT_TAG}' aspect: expected an array, got ${
        value === null ? 'null' : typeof value
      }`,
    )
    return []
  }

  const aspects: FilterAspect[] = []
  value.forEach((entry: unknown, index: number) => {
    const result = FilterAspectSchema.safeParse(entry)
    if (result.success) {
      aspects.push(result.data)
      return
    }
    logApi.warn(
      `[parseFilterAspects]: Dropping invalid '${FILTER_ASPECT_TAG}' entry ${index}: ${result.error.issues
        .map(
          (issue) => `${issue.path.join('.') || '(entry)'}: ${issue.message}`,
        )
        .join('; ')}`,
    )
  })
  return aspects
}
