/**
 * Pure helpers backing the list-value cell editor (CW-563).
 *
 * List-typed columns (e.g. `list_of_string`) were previously edited as a
 * single text cell whose contents were split on the literal separator `', '`.
 * Any input that did not use that exact comma+space separator collapsed into a
 * one-element list. Instead of asking users to hand-craft that string, the
 * TableBrowser now opens a dedicated editor where each element is edited
 * individually. This module holds the framework-agnostic logic for that editor
 * so it can be unit-tested without rendering the grid.
 */
import {
  ListOfValueType,
  SingleValueType,
  ValueType,
} from '../../../models/TableModel/ValueType'
import { ValueTypeName } from '../../../models/TableModel/ValueTypeName'
import {
  getSingleTypeFromList,
  isListType,
  serializedStringIsValid,
} from '../../../models/TableModel/impl/valueTypeImpl'

/**
 * Convert a stored cell value into an array of per-element strings for editing.
 * Handles null/undefined (empty list) and a non-array value that was somehow
 * stored in a list column (wrapped into a single element).
 */
export const toEditableItems = (
  value: ValueType | null | undefined,
): string[] => {
  if (value === null || value === undefined) {
    return []
  }
  if (Array.isArray(value)) {
    return value.map((v) => String(v))
  }
  return [String(value)]
}

/** Append a new (blank by default) element. Returns a new array. */
export const addItem = (items: string[], value = ''): string[] => [
  ...items,
  value,
]

/** Remove the element at `index`. Returns a new array. */
export const removeItem = (items: string[], index: number): string[] =>
  items.filter((_, i) => i !== index)

/** Replace the element at `index`. Returns a new array. */
export const updateItem = (
  items: string[],
  index: number,
  value: string,
): string[] => items.map((v, i) => (i === index ? value : v))

/** The single (element) type name for a given list type, e.g. list_of_long -> long. */
export const elementType = (listType: ValueTypeName): ValueTypeName =>
  getSingleTypeFromList(listType)

/** Coerce a single validated string into the concrete element value. */
export const coerceElement = (
  raw: string,
  singleType: ValueTypeName,
): SingleValueType => {
  const trimmed = raw.trim()
  switch (singleType) {
    case ValueTypeName.Boolean:
      return trimmed === 'true'
    case ValueTypeName.Long:
    case ValueTypeName.Integer:
    case ValueTypeName.Double:
      return +trimmed
    default:
      // string (and any unexpected type) stays as-is, untrimmed for strings
      return raw
  }
}

export interface ListValidationResult {
  /** The coerced list value, or null when any non-blank element is invalid. */
  value: ValueType | null
  /** Per-original-index error messages for invalid elements. */
  errors: Record<number, string>
}

/**
 * Validate the edited items and, when all non-blank elements are valid, build
 * the coerced list value.
 *
 * Blank (whitespace-only) elements are treated as "not yet filled in" and are
 * dropped from the result rather than reported as errors — this keeps a
 * trailing empty add-row from blocking a save. This applies to every element
 * type, so an intentionally empty string element is not supported (a rare,
 * meaningless case for network attribute lists).
 */
export const validateAndBuildListValue = (
  items: string[],
  listType: ValueTypeName,
): ListValidationResult => {
  if (!isListType(listType)) {
    return { value: null, errors: { [-1]: `${listType} is not a list type` } }
  }

  const singleType = getSingleTypeFromList(listType)
  const errors: Record<number, string> = {}
  const coerced: SingleValueType[] = []

  items.forEach((item, index) => {
    const isBlank = item.trim().length === 0
    if (isBlank) {
      // An unfilled row: skip it for every element type.
      return
    }

    if (!serializedStringIsValid(singleType, item.trim())) {
      errors[index] = `"${item}" is not a valid ${singleType}`
      return
    }
    coerced.push(coerceElement(item, singleType))
  })

  if (Object.keys(errors).length > 0) {
    return { value: null, errors }
  }

  return { value: coerced as ListOfValueType as ValueType, errors: {} }
}
