// src/models/AppModel/impl/parameters.ts
//
// Pure helpers behind the shared parameter spec (AppParameter) — used by the
// service-app dialog, the Layout Settings dialog, the App API's
// registerLayout validation and the layout adapter. No React, no stores.
// Spec: docs/specifications/APP_PARAMETERS_SPECIFICATION.md
import safeRegex from 'safe-regex'

import { ValueTypeName } from '../../TableModel/ValueTypeName'
import { AppParameter, ParameterValue } from '../AppParameter'
import { ParameterUiType } from '../ParameterUiType'
import { ValidationType } from '../ValidationType'

/** Joins a group path and a display name into a collision-free key. */
export const PARAMETER_KEY_SEPARATOR = '/'

const PARAMETER_UI_TYPES = new Set<string>(Object.values(ParameterUiType))
const VALIDATION_TYPES = new Set<string>(Object.values(ValidationType))

/** The two host-filled types a service app may declare; never shown. */
export const HOST_FILLED_PARAMETER_TYPES: ReadonlySet<string> = new Set([
  ParameterUiType.NdexUuid,
  ParameterUiType.AccessToken,
])

const groupsOf = (param: AppParameter): string[] =>
  Array.isArray(param.groups) ? param.groups : []

const qualifiedKey = (param: AppParameter): string =>
  [...groupsOf(param), param.displayName].join(PARAMETER_KEY_SEPARATOR)

/**
 * The key rule. A parameter's key is its `displayName`; when two or more
 * parameters in the list share a `displayName`, each of those is keyed by
 * its group path plus display name instead (`Group/Subgroup/Name`), so
 * same-label parameters in different groups stay distinct. Returns one key
 * per parameter, in list order.
 */
export const parameterKeys = (list: readonly AppParameter[]): string[] => {
  const counts = new Map<string, number>()
  for (const param of list) {
    counts.set(param.displayName, (counts.get(param.displayName) ?? 0) + 1)
  }
  return list.map((param) =>
    (counts.get(param.displayName) ?? 0) > 1
      ? qualifiedKey(param)
      : param.displayName,
  )
}

/** Keys that occur more than once even after the key rule (same label and same groups). */
export const duplicateParameterKeys = (
  list: readonly AppParameter[],
): string[] => {
  const seen = new Set<string>()
  const duplicates: string[] = []
  for (const key of parameterKeys(list)) {
    if (seen.has(key)) {
      if (!duplicates.includes(key)) duplicates.push(key)
    } else {
      seen.add(key)
    }
  }
  return duplicates
}

/**
 * The type of the value a parameter holds, from its declaration: `checkBox`
 * → boolean; `text` with `validationType` `number` → double, `digits` →
 * integer; everything else (free text, dropDown, radio, column pickers)
 * → string. `validationType` is only read for `text`.
 */
export const parameterValueType = (param: AppParameter): ValueTypeName => {
  if (param.type === ParameterUiType.CheckBox) return ValueTypeName.Boolean
  if (param.type === ParameterUiType.Text) {
    if (param.validationType === ValidationType.Number) {
      return ValueTypeName.Double
    }
    if (param.validationType === ValidationType.Digits) {
      return ValueTypeName.Integer
    }
  }
  return ValueTypeName.String
}

const zeroValue = (valueType: ValueTypeName): ParameterValue => {
  switch (valueType) {
    case ValueTypeName.Boolean:
      return false
    case ValueTypeName.Double:
    case ValueTypeName.Integer:
      return 0
    default:
      return ''
  }
}

/**
 * Turn a raw value (what a text field or a service payload holds) into the
 * parameter's typed value. A number that does not parse stays `NaN`, so
 * `validateParameterValue` can report it. `null` / `undefined` fall back to
 * the declared default, then to the type's zero value.
 */
export const coerceParameterValue = (
  param: AppParameter,
  raw: unknown,
): ParameterValue => {
  const valueType = parameterValueType(param)
  if (raw === null || raw === undefined) {
    return param.defaultValue === null || param.defaultValue === undefined
      ? zeroValue(valueType)
      : coerceParameterValue(param, param.defaultValue)
  }
  switch (valueType) {
    case ValueTypeName.Boolean:
      return typeof raw === 'boolean' ? raw : String(raw).trim() === 'true'
    case ValueTypeName.Double:
    case ValueTypeName.Integer: {
      if (typeof raw === 'number') return raw
      const text = String(raw).trim()
      return text === '' ? NaN : Number(text)
    }
    default:
      return typeof raw === 'string' ? raw : String(raw)
  }
}

// Compiled regexes are cached because validation runs on every keystroke.
const regexCache = new Map<string, RegExp>()
const MAX_CACHE_SIZE = 100
const MAX_REGEX_LENGTH = 1000

/**
 * Result of checking a `validationRegex`: `undefined` when the pattern is
 * unusable in a lenient way (bad syntax — skip it), or the compiled regex.
 * Throws for a pattern the host refuses to run (too long, or unsafe under
 * catastrophic backtracking).
 */
const compileValidationRegex = (pattern: string): RegExp | undefined => {
  if (pattern.length > MAX_REGEX_LENGTH) {
    throw new Error('validationRegex is too long')
  }
  let compiled: RegExp | undefined
  try {
    compiled = new RegExp(pattern)
  } catch {
    return undefined
  }
  if (!safeRegex(pattern)) {
    throw new Error('validationRegex is unsafe')
  }
  const cached = regexCache.get(pattern)
  if (cached !== undefined) return cached
  if (regexCache.size >= MAX_CACHE_SIZE) regexCache.clear()
  regexCache.set(pattern, compiled)
  return compiled
}

const hasValues = (
  param: AppParameter,
): param is AppParameter & {
  valueList: string[]
} => Array.isArray(param.valueList) && param.valueList.length > 0

/**
 * Validate a value against its parameter's rules. Returns the message to
 * show (the declared `validationHelp`, or a built-in default) or
 * `undefined` when the value is acceptable. Only `text` (regex, number,
 * digits, min/max) and `dropDown` / `radio` (value ∈ valueList) can fail.
 */
export const validateParameterValue = (
  param: AppParameter,
  value: unknown,
): string | undefined => {
  const help = (fallback: string): string =>
    typeof param.validationHelp === 'string' &&
    param.validationHelp.trim() !== ''
      ? param.validationHelp
      : fallback

  if (
    (param.type === ParameterUiType.DropDown ||
      param.type === ParameterUiType.Radio) &&
    hasValues(param)
  ) {
    return param.valueList.includes(String(value))
      ? undefined
      : help(`Must be one of: ${param.valueList.join(', ')}`)
  }

  if (param.type !== ParameterUiType.Text) return undefined

  const valueType = parameterValueType(param)
  if (
    valueType === ValueTypeName.Double ||
    valueType === ValueTypeName.Integer
  ) {
    const numeric = coerceParameterValue(param, value)
    if (typeof numeric !== 'number' || !Number.isFinite(numeric)) {
      return help(
        valueType === ValueTypeName.Integer
          ? 'Must be a whole number'
          : 'Must be a number',
      )
    }
    if (valueType === ValueTypeName.Integer && !Number.isInteger(numeric)) {
      return help('Must be a whole number')
    }
    if (typeof param.minValue === 'number' && numeric < param.minValue) {
      return help(`Must be at least ${param.minValue}`)
    }
    if (typeof param.maxValue === 'number' && numeric > param.maxValue) {
      return help(`Must be at most ${param.maxValue}`)
    }
    return undefined
  }

  const pattern = param.validationRegex
  if (typeof pattern !== 'string' || pattern.trim() === '') return undefined
  let regex: RegExp | undefined
  try {
    regex = compileValidationRegex(pattern)
  } catch (e) {
    return e instanceof Error ? e.message : String(e)
  }
  if (regex === undefined) return undefined // unparseable: be lenient
  return regex.test(String(value ?? ''))
    ? undefined
    : help(`Must match ${pattern}`)
}

// ── Presentation grouping ────────────────────────────────────────────────

export type ParameterGroupChild =
  | { kind: 'parameter'; index: number }
  | { kind: 'group'; node: ParameterGroupNode }

export interface ParameterGroupNode {
  /** Group names from the outermost group down; `[]` for the root. */
  path: string[]
  /** Parameters and subgroups in first-appearance order. */
  children: ParameterGroupChild[]
}

/**
 * Build the presentation tree: a parameter with `groups: [A, B]` nests
 * under A → B. At every level, parameters and subgroups appear in the
 * order they were first seen in the flat array, so the fields of one group
 * stay together even when the array interleaves them.
 */
export const groupParameters = (
  list: readonly AppParameter[],
): ParameterGroupNode => {
  const root: ParameterGroupNode = { path: [], children: [] }
  list.forEach((param, index) => {
    let node = root
    for (const group of groupsOf(param)) {
      let child = node.children.find(
        (c): c is { kind: 'group'; node: ParameterGroupNode } =>
          c.kind === 'group' && c.node.path[c.node.path.length - 1] === group,
      )
      if (child === undefined) {
        child = {
          kind: 'group',
          node: { path: [...node.path, group], children: [] },
        }
        node.children.push(child)
      }
      node = child.node
    }
    node.children.push({ kind: 'parameter', index })
  })
  return root
}

// ── Definition validation ────────────────────────────────────────────────

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === 'string')

/**
 * Check one parameter definition. Structural rules apply to every consumer
 * (they cannot be rendered otherwise); `strict` adds the rules the App API
 * imposes on layouts: a default value present and typed for the value type,
 * and no host-filled types. Service payloads are not held to `strict`:
 * they send every default as a string and the host coerces.
 */
export const parameterDefinitionProblem = (
  param: unknown,
  index: number,
  { strict = false }: { strict?: boolean } = {},
): string | undefined => {
  const at = `parameters[${index}]`
  if (typeof param !== 'object' || param === null) {
    return `${at} must be an object`
  }
  const p = param as Record<string, unknown>
  if (typeof p.displayName !== 'string' || p.displayName.trim() === '') {
    return `${at}: displayName is required and must be non-empty`
  }
  const label = `parameter '${p.displayName}'`
  if (typeof p.type !== 'string' || !PARAMETER_UI_TYPES.has(p.type)) {
    return `${label}: type must be one of ${[...PARAMETER_UI_TYPES].join(', ')}`
  }
  if (p.description != null && typeof p.description !== 'string') {
    return `${label}: description must be a string`
  }
  if (p.type === ParameterUiType.DropDown || p.type === ParameterUiType.Radio) {
    if (!isStringArray(p.valueList) || p.valueList.length === 0) {
      return `${label}: valueList must be a non-empty array of strings for type '${p.type}'`
    }
  }
  if (p.groups != null) {
    if (!isStringArray(p.groups) || p.groups.some((g) => g.trim() === '')) {
      return `${label}: groups must be an array of non-empty strings`
    }
  }
  if (p.validationType != null) {
    if (
      typeof p.validationType !== 'string' ||
      !VALIDATION_TYPES.has(p.validationType)
    ) {
      return `${label}: validationType must be one of ${[...VALIDATION_TYPES].join(', ')}`
    }
  }
  if (p.validationRegex != null && typeof p.validationRegex !== 'string') {
    return `${label}: validationRegex must be a string`
  }
  if (
    p.columnTypeFilter != null &&
    typeof p.columnTypeFilter !== 'string' &&
    !isStringArray(p.columnTypeFilter)
  ) {
    return `${label}: columnTypeFilter must be a string or an array of strings`
  }
  if (p.validationHelp != null && typeof p.validationHelp !== 'string') {
    return `${label}: validationHelp must be a string`
  }
  for (const bound of ['minValue', 'maxValue'] as const) {
    if (p[bound] != null && typeof p[bound] !== 'number') {
      return `${label}: ${bound} must be a number`
    }
  }
  if (
    typeof p.minValue === 'number' &&
    typeof p.maxValue === 'number' &&
    p.minValue > p.maxValue
  ) {
    return `${label}: minValue must not exceed maxValue`
  }

  if (!strict) return undefined

  if (HOST_FILLED_PARAMETER_TYPES.has(p.type)) {
    return `${label}: type '${p.type}' is not available to app layouts`
  }
  const typed = p as unknown as AppParameter
  const valueType = parameterValueType(typed)
  const expected =
    valueType === ValueTypeName.Boolean
      ? 'boolean'
      : valueType === ValueTypeName.String
        ? 'string'
        : 'number'
  if (typeof p.defaultValue !== expected) {
    return `${label}: defaultValue is required and must be a ${expected}`
  }
  if (
    valueType === ValueTypeName.Integer &&
    !Number.isInteger(p.defaultValue)
  ) {
    return `${label}: defaultValue must be a whole number for validationType 'digits'`
  }
  if (hasValues(typed) && !typed.valueList.includes(String(p.defaultValue))) {
    return `${label}: defaultValue must be one of valueList`
  }
  return undefined
}
