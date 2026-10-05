import {
  ColumnFilterCriterion,
  FilterPredicate,
  NumberRangeCriterion,
} from '../FilterTree'

/**
 * Comparisons of the FILTER tab's conditions, ported from Cytoscape Desktop's
 * `PredicateDelegates` so a filter selects the same elements in both
 * applications. See `docs/specifications/FILTER_SPECIFICATION.md`.
 */

/**
 * Longest regular expression a condition accepts. Filter files are untrusted
 * input; this bounds the work of compiling one, not the cost of running it.
 */
export const MAX_REGEX_LENGTH = 1000

/**
 * Java's `Double.compare`: NaN is equal to itself and greater than every
 * other value, and -0 is less than 0. Cytoscape Desktop compares with it, so
 * NaN cells pass "greater than" and fail "less than" there too.
 */
export const compareDouble = (a: number, b: number): number => {
  if (a < b) return -1
  if (a > b) return 1
  const aIsNaN = Number.isNaN(a)
  const bIsNaN = Number.isNaN(b)
  if (aIsNaN || bIsNaN) {
    if (aIsNaN && bIsNaN) return 0
    return aIsNaN ? 1 : -1
  }
  // Equal by value: only the zeros still differ
  if (Object.is(a, -0) && Object.is(b, 0)) return -1
  if (Object.is(a, 0) && Object.is(b, -0)) return 1
  return 0
}

/**
 * Whether a predicate compares numbers
 */
export const isNumericPredicate = (predicate: FilterPredicate): boolean =>
  predicate === FilterPredicate.IS ||
  predicate === FilterPredicate.IS_NOT ||
  predicate === FilterPredicate.GREATER_THAN ||
  predicate === FilterPredicate.GREATER_THAN_OR_EQUAL ||
  predicate === FilterPredicate.LESS_THAN ||
  predicate === FilterPredicate.LESS_THAN_OR_EQUAL ||
  predicate === FilterPredicate.BETWEEN ||
  predicate === FilterPredicate.IS_NOT_BETWEEN

/**
 * Whether a predicate compares text
 */
export const isStringPredicate = (predicate: FilterPredicate): boolean =>
  predicate === FilterPredicate.IS ||
  predicate === FilterPredicate.IS_NOT ||
  predicate === FilterPredicate.CONTAINS ||
  predicate === FilterPredicate.DOES_NOT_CONTAIN ||
  predicate === FilterPredicate.REGEX

const between = (
  lower: number | null,
  upper: number | null,
  value: number | null,
): boolean => {
  if (lower === null || upper === null || value === null) {
    return false
  }
  return compareDouble(value, lower) >= 0 && compareDouble(value, upper) <= 0
}

/**
 * Compare a number. The single-value predicates use `lower` only; BETWEEN
 * and IS_NOT_BETWEEN are inclusive of both bounds.
 *
 * A missing value (null) fails every predicate except IS_NOT_BETWEEN; note
 * that IS_NOT rejects it, unlike the text IS_NOT. A text predicate rejects
 * every number.
 *
 * @param lower Lower bound, or null when the criterion is not numeric
 * @param upper Upper bound, or null when the criterion is not numeric
 * @param value The cell value, or null when missing
 */
export const numericAccepts = (
  predicate: FilterPredicate,
  lower: number | null,
  upper: number | null,
  value: number | null,
): boolean => {
  switch (predicate) {
    case FilterPredicate.BETWEEN:
      return between(lower, upper, value)
    case FilterPredicate.IS_NOT_BETWEEN:
      return !between(lower, upper, value)
    default:
      break
  }
  // The rest compare against the lower bound
  if (value === null || lower === null) {
    return false
  }
  switch (predicate) {
    case FilterPredicate.IS:
      return value === lower
    case FilterPredicate.IS_NOT:
      return value !== lower
    case FilterPredicate.GREATER_THAN:
      return compareDouble(value, lower) > 0
    case FilterPredicate.GREATER_THAN_OR_EQUAL:
      return compareDouble(value, lower) >= 0
    case FilterPredicate.LESS_THAN:
      return compareDouble(value, lower) < 0
    case FilterPredicate.LESS_THAN_OR_EQUAL:
      return compareDouble(value, lower) <= 0
    default:
      return false
  }
}

/**
 * Compare a text value. Matching ignores case unless `caseSensitive`.
 *
 * A missing value (null) passes IS_NOT and DOES_NOT_CONTAIN and fails the
 * rest. A numeric predicate rejects every text value.
 *
 * @param regex The compiled pattern, required for REGEX (see compileRegex)
 */
export const stringAccepts = (
  predicate: FilterPredicate,
  criterion: string,
  caseSensitive: boolean,
  value: string | null,
  regex?: RegExp,
): boolean => {
  const fold = (text: string): string =>
    caseSensitive ? text : text.toLowerCase()
  switch (predicate) {
    case FilterPredicate.IS:
      return value !== null && fold(value) === fold(criterion)
    case FilterPredicate.IS_NOT:
      return value === null || fold(value) !== fold(criterion)
    case FilterPredicate.CONTAINS:
      return value !== null && fold(value).includes(fold(criterion))
    case FilterPredicate.DOES_NOT_CONTAIN:
      return value === null || !fold(value).includes(fold(criterion))
    case FilterPredicate.REGEX:
      return value !== null && regex !== undefined && regex.test(value)
    default:
      return false
  }
}

/**
 * Compile the pattern of a REGEX condition. As in Cytoscape Desktop (Java's
 * `Matcher.matches`), the pattern must match the whole value, so it is
 * anchored at both ends.
 *
 * Never throws: a pattern that is too long or that JavaScript cannot compile
 * (for example Java-only syntax such as possessive quantifiers) comes back as
 * an Error, and the condition then rejects every element.
 */
export const compileRegex = (
  pattern: string,
  caseSensitive: boolean,
): RegExp | Error => {
  if (pattern.length > MAX_REGEX_LENGTH) {
    return new Error(
      `The pattern is longer than ${MAX_REGEX_LENGTH} characters`,
    )
  }
  try {
    return new RegExp(`^(?:${pattern})$`, caseSensitive ? '' : 'i')
  } catch (e) {
    return e instanceof Error ? e : new Error(String(e))
  }
}

/**
 * Whether a value is a numeric range criterion: [lower, upper]
 */
export const isNumberRange = (
  criterion: unknown,
): criterion is NumberRangeCriterion =>
  Array.isArray(criterion) &&
  criterion.length === 2 &&
  typeof criterion[0] === 'number' &&
  typeof criterion[1] === 'number'

/**
 * The bounds of a numeric criterion: a number n is the range [n, n]. Null
 * for any other criterion.
 */
export const toNumericBounds = (
  criterion: ColumnFilterCriterion,
): NumberRangeCriterion | null => {
  if (typeof criterion === 'number') {
    return [criterion, criterion]
  }
  if (isNumberRange(criterion)) {
    return criterion
  }
  return null
}
