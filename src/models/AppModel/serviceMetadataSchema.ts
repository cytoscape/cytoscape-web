import { z } from 'zod'

import { logApp } from '../../debug'
import {
  duplicateParameterKeys,
  parameterDefinitionProblem,
} from './impl/parameters'

import type { ServiceMetadata } from './ServiceMetadata'

/**
 * Runtime validation for service-app metadata fetched from an endpoint.
 *
 * Two exports with deliberately different jobs:
 *
 * - `ServiceMetadataSchema` answers "is this a usable service app?" and gates
 *   registration (`serviceFetcher`).
 * - `serviceMetadataIfMarked` answers "is this a service app rather than a
 *   React app manifest?" and gates classification of an `?installApp=` payload.
 *
 * The second is strictly narrower, and the difference matters: service apps in
 * the wild (and the fixtures in AppStore.spec.ts) register successfully with
 * nothing but a `name` and `parameters`. Requiring a service marker to
 * *register* would reject them, including on `refreshAllServices`. A marker is
 * how you tell the two payload shapes apart, not what makes metadata valid.
 *
 * Leniency elsewhere is also deliberate:
 *
 * - `.passthrough()` — the service-app spec ships with the Cytoscape Web paper
 *   and gains fields independently of this repo. Unknown keys must survive into
 *   the stored ServiceApp, not be stripped.
 * - `author`/`citation`/`description` accept null. ServiceMetadata declares the
 *   first two as required strings, but real endpoints send `null`, so a schema
 *   matching the interface literally would reject working apps.
 * - `parameters` defaults to `[]`. `updateServiceParameter` calls
 *   `serviceApp.parameters.find(...)`, which throws when the array is absent.
 */

const MenuPathElementSchema = z
  .object({
    name: z.string().optional(),
    gravity: z.number().optional(),
  })
  .passthrough()

const CyWebMenuItemSchema = z
  .object({
    root: z.string().optional(),
    path: z.array(MenuPathElementSchema).optional(),
  })
  .passthrough()

// Only `displayName` is required. Everything else — including `groups`
// (presentation nesting, docs/specifications/APP_PARAMETERS_SPECIFICATION.md)
// — passes through unchecked: services send `null` for what does not apply,
// and a stricter shape here would reject apps that work. Malformed fields
// are reported by `warnAboutParameterDefinitions` below and rendered as
// best the form can (a malformed `groups` is treated as no groups).
const ServiceAppParameterSchema = z
  .object({
    displayName: z.string(),
  })
  .passthrough()

export const ServiceMetadataSchema = z
  .object({
    name: z.string().min(1),
    version: z.string().optional(),
    description: z.string().nullish(),
    showDescriptionInDialog: z.boolean().optional(),
    author: z.string().nullish(),
    citation: z.string().nullish(),
    cyWebActions: z.array(z.string()).optional(),
    cyWebMenuItem: CyWebMenuItemSchema.optional(),
    serviceInputDefinition: z.record(z.unknown()).nullish(),
    parameters: z.array(ServiceAppParameterSchema).optional().default([]),
  })
  .passthrough()

/**
 * Validate a fetched payload as service metadata.
 *
 * Returns the parsed metadata, or undefined when it is not a service app. The
 * cast is safe only because the schema mirrors ServiceMetadata's required
 * fields; zod's inferred type is wider (passthrough, nullable) than the
 * interface, which is the point — see the leniency notes above.
 */
export const parseServiceMetadata = (
  data: unknown,
): ServiceMetadata | undefined => {
  const result = ServiceMetadataSchema.safeParse(data)
  if (!result.success) {
    return undefined
  }
  const metadata = result.data as unknown as ServiceMetadata
  warnAboutParameterDefinitions(metadata)
  return dropUnusableParameters(metadata)
}

/**
 * A parameter whose displayName is `__proto__` cannot be carried by any of
 * the plain records the host keys by parameter key (the dialog's values, the
 * run payload built by `buildCustomParameters`): assigning that key invokes
 * the prototype setter and the value silently disappears.
 * `parameterDefinitionProblem` reports it (above); the lenient service path
 * then drops that one parameter rather than the whole service.
 */
const dropUnusableParameters = (metadata: ServiceMetadata): ServiceMetadata => {
  const usable = metadata.parameters.filter(
    (parameter) => parameter.displayName !== '__proto__',
  )
  return usable.length === metadata.parameters.length
    ? metadata
    : { ...metadata, parameters: usable }
}

/**
 * Report, without rejecting, parameter definitions the form cannot render
 * as declared (an unknown type, a dropDown without values, ...) and
 * parameters that share a displayName within the same groups (the key rule
 * cannot tell them apart; the last one wins in the store). Services that
 * work today keep working; the log says what to fix.
 */
const warnAboutParameterDefinitions = (metadata: ServiceMetadata): void => {
  metadata.parameters.forEach((parameter, index) => {
    const problem = parameterDefinitionProblem(parameter, index)
    if (problem !== undefined) {
      logApp.warn(
        `[serviceMetadata]: "${metadata.name}": ${problem}; the parameter may not render as intended`,
      )
    }
  })
  const duplicates = duplicateParameterKeys(metadata.parameters)
  if (duplicates.length > 0) {
    logApp.warn(
      `[serviceMetadata]: "${metadata.name}" declares parameters that share a displayName within the same groups (${duplicates.join(', ')}); only the last of each is editable`,
    )
  }
}

/**
 * Parse a payload only if it is service-app metadata rather than a React app
 * manifest: valid metadata *plus* at least one field only a service app
 * declares. Returns undefined otherwise.
 *
 * Stricter than `parseServiceMetadata`, and used only to tell the two payload
 * shapes apart. Requiring a marker to *register* would reject service apps that
 * work today — see the note above.
 *
 * Returns the metadata rather than a boolean so the caller does not have to
 * parse a second time to get at it.
 */
export const serviceMetadataIfMarked = (
  data: unknown,
): ServiceMetadata | undefined => {
  if (typeof data !== 'object' || data === null) {
    return undefined
  }
  const raw = data as Record<string, unknown>
  const marked =
    raw.cyWebActions !== undefined ||
    raw.cyWebMenuItem !== undefined ||
    raw.serviceInputDefinition !== undefined

  return marked ? parseServiceMetadata(data) : undefined
}
