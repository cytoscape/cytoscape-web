import safeRegex from 'safe-regex'

import { Column, ValueTypeName } from '../../TableModel'
import { ParameterUiType } from '../ParameterUiType'
import { SelectedDataType } from '../SelectedDataType'
import { ServiceAppParameter } from '../ServiceAppParameter'
import { InputColumn, ServiceInputDefinition } from '../ServiceInputDefinition'

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
}

/**
 * Whether a parameter type is auto-filled by the webapp (its value is resolved
 * at run time) and therefore should be hidden from the input dialog.
 */
export const isAutoFilledParameter = (type: ParameterUiType): boolean => {
  return type === ParameterUiType.NdexUuid
}

/**
 * Resolve the value that should be sent for a service-app parameter. Auto-filled
 * parameter types (e.g. ndexUUID) draw from the provided context; all other
 * types use the user-selected value, falling back to the default.
 */
export const resolveParameterValue = (
  parameter: ServiceAppParameter,
  ctx: AutoParameterContext,
): string => {
  switch (parameter.type) {
    case ParameterUiType.NdexUuid:
      return ctx.ndexNetworkUrl ?? ''
    default:
      return parameter.value ?? parameter.defaultValue
  }
}

/**
 * Build the `parameters` map posted to a service app, keyed by displayName.
 * Auto-filled parameters (ndexUUID, ...) are resolved from the context.
 */
export const buildCustomParameters = (
  parameters: ServiceAppParameter[] | undefined,
  ctx: AutoParameterContext,
): Record<string, string> => {
  return (parameters ?? []).reduce(
    (acc, parameter) => {
      acc[parameter.displayName] = resolveParameterValue(parameter, ctx)
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

export const inputColumnFilterFn = (
  column: Column,
  inputColumn: InputColumn,
): boolean => {
  switch (inputColumn.dataType) {
    case 'list': {
      return isList(column.type)
    }
    case 'number': {
      return isNumber(column.type)
    }
    case 'wholenumber': {
      return column.type === 'integer'
    }
    case 'list_of_number': {
      return isNumberList(column.type)
    }
    case 'list_of_wholenumber': {
      return column.type === 'list_of_integer'
    }
    default: {
      return column.type === inputColumn.dataType
    }
  }
}

const regexCache = new Map<string, RegExp>()
const MAX_CACHE_SIZE = 100

export const validateParameter = (parameter: ServiceAppParameter): boolean => {
  if (parameter.type === ParameterUiType.Text) {
    const value = parameter.value ?? parameter.defaultValue ?? ''
    const { validationRegex } = parameter

    if (
      validationRegex !== undefined &&
      validationRegex !== null &&
      validationRegex.trim().length > 0
    ) {
      if (validationRegex.length > 1000) {
        return false
      }
      try {
        if (!safeRegex(validationRegex)) {
          // Attempt to compile it. If it fails, it's just invalid syntax,
          // and we should be lenient (return true).
          // If it succeeds, then it's a valid but unsafe regex (return false).
          new RegExp(validationRegex)
          return false
        }
        let regex = regexCache.get(validationRegex)
        if (regex === undefined) {
          if (regexCache.size >= MAX_CACHE_SIZE) {
            regexCache.clear()
          }
          regex = new RegExp(validationRegex)
          regexCache.set(validationRegex, regex)
        }
        return regex.test(value)
      } catch {
        return true
      }
    }
  }
  return true
}
