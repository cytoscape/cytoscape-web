import { Column, ValueTypeName } from '../../TableModel'
import { ParameterUiType } from '../ParameterUiType'
import { SelectedDataType } from '../SelectedDataType'
import { ServiceAppParameter } from '../ServiceAppParameter'
import { InputColumn, ServiceInputDefinition } from '../ServiceInputDefinition'
import { parameterKeys } from './parameters'

export {
  DEFAULT_ROOT_MENU,
  SUPPORTED_ROOT_MENUS,
  filterServiceAppsByRoot,
  invalidRootMessage,
  parseRootMenu,
  resolveRootMenu,
} from './menuRouting'
export type { RootMenuResolution } from './menuRouting'

/**
 * Normalize a service-app endpoint URL for comparison and storage: trims
 * surrounding whitespace and removes a single trailing slash.
 */
export const normalizeServiceAppUrl = (url: string): string => {
  const trimmed = url.trim()
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
}

/**
 * Build the full NDEx REST URL for a network from the configured NDEx host and
 * the network's external (NDEx) id.
 */
export const ndexNetworkUrl = (
  ndexBaseUrl: string,
  externalId: string,
): string => {
  return `${ndexBaseUrl.replace(/\/+$/, '')}/v3/networks/${externalId}`
}

/**
 * Context used to resolve the values of auto-filled service-app parameters.
 */
export interface AutoParameterContext {
  // Full NDEx URL of the current network, or '' when it is not an NDEx network.
  ndexNetworkUrl?: string
  // The user's NDEx access/credential token, or '' when not signed in.
  accessToken?: string
}

/**
 * Whether a parameter type is auto-filled by the webapp (its value is resolved
 * at run time) and therefore should be hidden from the input dialog.
 */
export const isAutoFilledParameter = (type: ParameterUiType): boolean => {
  return (
    type === ParameterUiType.NdexUuid || type === ParameterUiType.AccessToken
  )
}

/**
 * Resolve the value that should be sent for a service-app parameter. Auto-filled
 * parameter types (e.g. ndexUUID, accessToken) draw from the provided context;
 * all other types use the user-selected value, falling back to the default.
 */
export const resolveParameterValue = (
  parameter: ServiceAppParameter,
  ctx: AutoParameterContext,
): string => {
  switch (parameter.type) {
    case ParameterUiType.NdexUuid:
      return ctx.ndexNetworkUrl ?? ''
    case ParameterUiType.AccessToken:
      return ctx.accessToken ?? ''
    default:
      return parameter.value ?? parameter.defaultValue
  }
}

/**
 * Build the `parameters` map posted to a service app, keyed by the
 * parameter key rule (`parameterKeys`): displayName, or the group path
 * joined with '/' when two parameters share a displayName. Auto-filled
 * parameters (ndexUUID, ...) are resolved from the context.
 */
export const buildCustomParameters = (
  parameters: ServiceAppParameter[] | undefined,
  ctx: AutoParameterContext,
): Record<string, string> => {
  const list = parameters ?? []
  const keys = parameterKeys(list)
  return list.reduce(
    (acc, parameter, index) => {
      acc[keys[index]] = resolveParameterValue(parameter, ctx)
      return acc
    },
    {} as Record<string, string>,
  )
}

/**
 * Whether a service app declines to receive any data (nodes, edges, or the
 * network). Such apps only send their parameter options; no data payload is
 * built. Corresponds to serviceInputDefinition.type === 'none' (CW-468).
 */
export const sendsNoData = (
  serviceInputDefinition: ServiceInputDefinition | undefined,
): boolean => {
  return serviceInputDefinition?.type === SelectedDataType.None
}

/**
 * Whether a service app's description should be rendered at the top of its
 * input dialog. The description is shown when it is non-empty and the app has
 * not explicitly opted out via `showDescriptionInDialog: false`.
 */
export const shouldShowServiceDescription = (
  description: string | undefined | null,
  showDescriptionInDialog: boolean | undefined,
): boolean => {
  if (showDescriptionInDialog === false) {
    return false
  }
  return (
    description !== undefined &&
    description !== null &&
    description.trim() !== ''
  )
}

export const isList = (vtn: ValueTypeName): boolean => {
  return vtn.includes('list_of')
}

export const isNumber = (vtn: ValueTypeName): boolean => {
  return vtn === 'integer' || vtn === 'double' || vtn === 'long'
}

export const isNumberList = (vtn: ValueTypeName): boolean => {
  return (
    vtn === 'list_of_integer' ||
    vtn === 'list_of_double' ||
    vtn === 'list_of_long'
  )
}

/**
 * Whether a column's datatype satisfies a parameter's column type filter.
 *
 * The filter may be a concrete CX2 datatype (e.g. 'string', 'list_of_string'),
 * or one of the convenience aliases 'number' (any numeric), 'wholenumber'
 * (integer), 'list' (any list), 'list_of_number', 'list_of_wholenumber' — or
 * a list of those, of which any may match. An empty/absent filter matches
 * every column.
 */
export const columnTypeMatchesFilter = (
  columnType: ValueTypeName,
  filter: string | readonly string[] | undefined | null,
): boolean => {
  if (filter === undefined || filter === null || filter === '') {
    return true
  }
  if (Array.isArray(filter)) {
    return (
      filter.length === 0 ||
      filter.some((one) => columnTypeMatchesFilter(columnType, one))
    )
  }
  switch (filter) {
    case 'list': {
      return isList(columnType)
    }
    case 'number': {
      return isNumber(columnType)
    }
    case 'wholenumber': {
      return columnType === 'integer'
    }
    case 'list_of_number': {
      return isNumberList(columnType)
    }
    case 'list_of_wholenumber': {
      return columnType === 'list_of_integer'
    }
    default: {
      return columnType === filter
    }
  }
}

export const inputColumnFilterFn = (
  column: Column,
  inputColumn: InputColumn,
): boolean => {
  return columnTypeMatchesFilter(column.type, inputColumn.dataType)
}

// Value validation (regex, number/digits, min/max, valueList) lives in
// ./parameters.ts as `validateParameterValue`, shared with layout parameters.
