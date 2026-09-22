// src/models/AppModel/AppParameter.ts
//
// The one parameter spec shared by service apps (parameters arrive as JSON
// from the service endpoint) and by layout algorithms (built-in ones and the
// ones apps register through the App API). Everything here is plain JSON:
// no functions, no classes. The full field-by-field contract lives in
// docs/specifications/APP_PARAMETERS_SPECIFICATION.md.

import { ColumnTypeFilter } from './ColumnTypeFilter'
import { ParameterUiType } from './ParameterUiType'
import { ValidationType } from './ValidationType'

/** The scalar values a parameter can hold. */
export type ParameterValue = string | number | boolean

/**
 * One parameter shown to the user. Parameters are declared as an ordered
 * array: the form renders them in array order, and `groups` nests them into
 * presentation groups (outermost first), rendered as fieldsets.
 *
 * `displayName` is both the label and the parameter's key — the key a
 * layout's `run` reads the value under and the key a service payload sends
 * it under. When two parameters in one list share a `displayName`, the
 * colliding ones are keyed by their group path instead
 * (`Group/Subgroup/Display Name`); see `parameterKeys` in impl/parameters.ts.
 *
 * Fields are nullable because real service endpoints send `null` rather
 * than omitting what does not apply.
 */
export interface AppParameter {
  /** Label of the parameter; also its key (see above). Required. */
  displayName: string
  /** Tooltip or hint describing the parameter in more detail. */
  description?: string | null
  /** The UI component to show. */
  type: ParameterUiType
  /** Values of a `dropDown` or `radio` parameter. */
  valueList?: string[] | null
  /**
   * Initial value. `text`: the text box content; `checkBox`: `true` checks
   * the box; `dropDown` / `radio` / `nodeColumn` / `edgeColumn`: the
   * selected value when possible.
   */
  defaultValue?: ParameterValue | null
  /**
   * `text` only: `string` (free text, optionally constrained by
   * `validationRegex`), `number` (floating point) or `digits` (whole
   * numbers), both optionally bounded by `minValue` / `maxValue`.
   */
  validationType?: ValidationType | null
  /** `nodeColumn` / `edgeColumn` only: which columns to offer. */
  columnTypeFilter?: ColumnTypeFilter | null
  /** `text` only: the message shown when validation fails. */
  validationHelp?: string | null
  /** `text` + `string` only: the value must match this regular expression. */
  validationRegex?: string | null
  /** `text` + `number` / `digits` only: smallest allowed value. */
  minValue?: number | null
  /** `text` + `number` / `digits` only: largest allowed value. */
  maxValue?: number | null
  /**
   * Presentation grouping, outermost group first, like Cytoscape Desktop's
   * `@Tunable(groups = {...})`. A parameter with no groups belongs to the
   * top level. The order in which groups are first seen in the array is
   * the order they render in.
   */
  groups?: string[] | null
}
