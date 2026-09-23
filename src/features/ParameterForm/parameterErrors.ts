import { useMemo } from 'react'

import {
  AppParameter,
  ParameterValue,
} from '../../models/AppModel/AppParameter'
import {
  columnTypeMatchesFilter,
  isAutoFilledParameter,
} from '../../models/AppModel/impl'
import {
  parameterKeys,
  validateParameterValue,
} from '../../models/AppModel/impl/parameters'
import { ParameterUiType } from '../../models/AppModel/ParameterUiType'
import { IdType } from '../../models/IdType'
import { Column } from '../../models/TableModel'
import { NetworkColumns, useNetworkColumns } from './useNetworkColumns'

export type ParameterValues = Readonly<
  Record<string, ParameterValue | null | undefined>
>

/** The columns a column-typed parameter may pick from. */
export const columnChoices = (
  param: AppParameter,
  columns: NetworkColumns,
): readonly Column[] => {
  const source =
    param.type === ParameterUiType.EdgeColumn
      ? columns.edgeColumns
      : columns.nodeColumns
  return (
    source
      .filter((column) =>
        columnTypeMatchesFilter(column.type, param.columnTypeFilter),
      )
      // Alphabetical, case-insensitive, so "Zeta" does not sort before "alpha".
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      )
  )
}

/**
 * Validation messages by key for one parameter list. Host-filled types are
 * skipped. A column-typed parameter whose value is not a column of the
 * current network (a choice made on another network — layout parameters are
 * per algorithm, not per network) is reported, so a run cannot silently use
 * a stale column name.
 */
export const computeParameterErrors = (
  parameters: readonly AppParameter[],
  keys: readonly string[],
  values: ParameterValues,
  columns: NetworkColumns,
): Record<string, string> => {
  const errors: Record<string, string> = {}
  parameters.forEach((param, index) => {
    if (isAutoFilledParameter(param.type)) return
    const key = keys[index]
    const value = values[key] ?? param.defaultValue
    if (
      param.type === ParameterUiType.NodeColumn ||
      param.type === ParameterUiType.EdgeColumn
    ) {
      const name = value === null || value === undefined ? '' : String(value)
      if (
        name !== '' &&
        !columnChoices(param, columns).some((c) => c.name === name)
      ) {
        errors[key] = `Column '${name}' is not in the current network`
      }
      return
    }
    const message = validateParameterValue(param, value)
    if (message !== undefined) errors[key] = message
  })
  return errors
}

/**
 * The validation map a dialog uses to gate its Apply / Submit button. `keys`
 * defaults to the key rule (`parameterKeys`); the Layout Settings dialog
 * passes the editables' engine keys instead.
 */
export const useParameterErrors = (
  parameters: readonly AppParameter[],
  values: ParameterValues,
  options: { keys?: readonly string[]; networkId?: IdType } = {},
): Record<string, string> => {
  const columns = useNetworkColumns(options.networkId)
  const { keys } = options
  return useMemo(
    () =>
      computeParameterErrors(
        parameters,
        keys ?? parameterKeys(parameters),
        values,
        columns,
      ),
    [parameters, keys, values, columns],
  )
}
