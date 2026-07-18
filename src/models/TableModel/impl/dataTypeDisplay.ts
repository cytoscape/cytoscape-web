/**
 * Canonical, framework-agnostic display metadata for column/attribute data
 * types (CW-562).
 *
 * Before this module, at least five separate ad-hoc "type to display" mappings
 * lived across features (TableDataLoader's `valueTypeName2Label`, ToolBar's
 * `getTypeLabel`/`getTypeColor`, the Node/Edge creation dialogs'
 * `getColumnDescription`, plus several dropdowns rendering the raw enum string
 * like `list_of_string`). They disagreed on wording ("List of strings" vs
 * "List<String>" vs "list_of_string"). This module is the single source of
 * truth so every surface renders data types consistently.
 *
 * Pure TypeScript only — no React, no MUI (see the DataTypeChip component for
 * the reusable rendering).
 */
import { ValueTypeName } from '../ValueTypeName'

/**
 * Human-readable label, e.g. `list_of_string` -> "List of strings".
 * This is the canonical, user-facing wording used everywhere.
 */
export const dataTypeLabel = (type: ValueTypeName): string => {
  const labels: Record<ValueTypeName, string> = {
    [ValueTypeName.String]: 'String',
    [ValueTypeName.Long]: 'Long integer',
    [ValueTypeName.Integer]: 'Integer',
    [ValueTypeName.Double]: 'Double',
    [ValueTypeName.Boolean]: 'Boolean',
    [ValueTypeName.ListString]: 'List of strings',
    [ValueTypeName.ListLong]: 'List of long integers',
    [ValueTypeName.ListInteger]: 'List of integers',
    [ValueTypeName.ListDouble]: 'List of floating point numbers',
    [ValueTypeName.ListBoolean]: 'List of booleans',
  }
  return labels[type] ?? String(type)
}

/**
 * Compact abbreviation for space-constrained surfaces such as table column
 * headers, e.g. `string` -> "str", `list_of_string` -> "[str]".
 */
export const dataTypeAbbreviation = (type: ValueTypeName): string => {
  const abbreviations: Record<ValueTypeName, string> = {
    [ValueTypeName.String]: 'str',
    [ValueTypeName.Long]: 'long',
    [ValueTypeName.Integer]: 'int',
    [ValueTypeName.Double]: 'dbl',
    [ValueTypeName.Boolean]: 'bool',
    [ValueTypeName.ListString]: '[str]',
    [ValueTypeName.ListLong]: '[long]',
    [ValueTypeName.ListInteger]: '[int]',
    [ValueTypeName.ListDouble]: '[dbl]',
    [ValueTypeName.ListBoolean]: '[bool]',
  }
  return abbreviations[type] ?? String(type)
}

/**
 * Longer sentence description with an example, suitable for helper text in
 * data-entry forms.
 */
export const dataTypeDescription = (type: ValueTypeName): string => {
  const descriptions: Record<ValueTypeName, string> = {
    [ValueTypeName.String]: 'Text (string)',
    [ValueTypeName.Integer]: 'Whole number (integer)',
    [ValueTypeName.Long]: 'Large whole number (long)',
    [ValueTypeName.Double]: 'Decimal number (double)',
    [ValueTypeName.Boolean]: 'True/false (boolean)',
    [ValueTypeName.ListString]:
      'List of text (comma-separated, e.g., "apple, banana, cherry")',
    [ValueTypeName.ListInteger]:
      'List of integers (comma-separated, e.g., "1, 2, 3")',
    [ValueTypeName.ListLong]:
      'List of long integers (comma-separated, e.g., "100, 200, 300")',
    [ValueTypeName.ListDouble]:
      'List of decimals (comma-separated, e.g., "1.5, 2.7, 3.9")',
    [ValueTypeName.ListBoolean]:
      'List of booleans (comma-separated, e.g., "true, false, true")',
  }
  return descriptions[type] ?? 'Unknown type'
}

export type DataTypeChipColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'

/**
 * MUI Chip color family per data type. List types share one color; numeric
 * types another; strings are neutral; booleans distinct.
 */
export const dataTypeChipColor = (type: ValueTypeName): DataTypeChipColor => {
  if (String(type).startsWith('list_of_')) {
    return 'primary'
  }
  switch (type) {
    case ValueTypeName.String:
      return 'default'
    case ValueTypeName.Integer:
    case ValueTypeName.Long:
    case ValueTypeName.Double:
      return 'success'
    case ValueTypeName.Boolean:
      return 'secondary'
    default:
      return 'default'
  }
}

/** Convenience: all data types in a stable, display-friendly order. */
export const orderedDataTypes: ValueTypeName[] = [
  ValueTypeName.String,
  ValueTypeName.Integer,
  ValueTypeName.Long,
  ValueTypeName.Double,
  ValueTypeName.Boolean,
  ValueTypeName.ListString,
  ValueTypeName.ListInteger,
  ValueTypeName.ListLong,
  ValueTypeName.ListDouble,
  ValueTypeName.ListBoolean,
]
