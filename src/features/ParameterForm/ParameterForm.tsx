import { Box, FormLabel } from '@mui/material'
import { useMemo } from 'react'

import {
  AppParameter,
  ParameterValue,
} from '../../models/AppModel/AppParameter'
import { isAutoFilledParameter } from '../../models/AppModel/impl'
import {
  groupParameters,
  ParameterGroupNode,
  parameterKeys,
} from '../../models/AppModel/impl/parameters'
import { IdType } from '../../models/IdType'
import { ParameterField } from './ParameterField'
import { computeParameterErrors, ParameterValues } from './parameterErrors'
import { useNetworkColumns } from './useNetworkColumns'

export interface ParameterFormProps {
  /** The declared parameters, in the order they should appear. */
  parameters: readonly AppParameter[]
  /**
   * The key of each parameter, parallel to `parameters`. Defaults to the
   * key rule (`parameterKeys`: displayName, or the group path on a
   * collision). The Layout Settings dialog passes the editables' engine
   * keys instead, because built-in algorithms store values under the
   * engine's option names.
   */
  keys?: readonly string[]
  /** Current value per key; a missing entry shows the declared default. */
  values: ParameterValues
  /** Receives the key and a value typed by the declaration. */
  onChange: (key: string, value: ParameterValue) => void
  /** The network whose columns `nodeColumn` / `edgeColumn` parameters pick from. */
  networkId?: IdType
  /** Prefix of every `data-testid`: `${prefix}-field-${key}`, `${prefix}-group-${path}`. */
  testIdPrefix: string
  disabled?: boolean
}

/**
 * Renders one parameter list (the shared `AppParameter` spec) as a form:
 * fields in array order, nested into fieldsets by `groups` (each group a
 * `<fieldset>` with its name as the legend, in first-appearance order), the
 * host-filled types hidden. Validation messages show under the field; use
 * `useParameterErrors` with the same inputs to gate the dialog's button.
 *
 * Used by the Layout Settings dialog (built-in and app-registered
 * algorithms) and by the service-app dialog.
 */
export const ParameterForm = ({
  parameters,
  keys,
  values,
  onChange,
  networkId,
  testIdPrefix,
  disabled = false,
}: ParameterFormProps): JSX.Element => {
  const resolvedKeys = useMemo(
    () => keys ?? parameterKeys(parameters),
    [keys, parameters],
  )
  const tree = useMemo(() => groupParameters(parameters), [parameters])
  const columns = useNetworkColumns(networkId)
  const errors = useMemo(
    () => computeParameterErrors(parameters, resolvedKeys, values, columns),
    [parameters, resolvedKeys, values, columns],
  )

  const renderChildren = (node: ParameterGroupNode): JSX.Element[] =>
    node.children.flatMap((child) => {
      if (child.kind === 'group') {
        return [renderGroup(child.node)]
      }
      const param = parameters[child.index]
      if (isAutoFilledParameter(param.type)) return []
      const key = resolvedKeys[child.index]
      return [
        <ParameterField
          key={key}
          param={param}
          fieldKey={key}
          value={values[key]}
          error={errors[key]}
          columns={columns}
          disabled={disabled}
          testIdPrefix={testIdPrefix}
          onChange={(value) => onChange(key, value)}
        />,
      ]
    })

  const renderGroup = (node: ParameterGroupNode): JSX.Element => {
    const path = node.path.join('/')
    return (
      // `disabled` is applied per control, never on the fieldset element:
      // a disabled fieldset silently disables every descendant without MUI
      // reflecting it. `minWidth: 0` overrides the fieldset's intrinsic
      // min-content width, which would otherwise widen the dialog.
      <Box
        key={path}
        component="fieldset"
        data-testid={`${testIdPrefix}-group-${path}`}
        sx={{
          minWidth: 0,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          px: 2,
          pt: 1,
          pb: 0,
          mb: 2,
          mx: 0,
        }}
      >
        <FormLabel component="legend" sx={{ px: 0.5, fontSize: '0.875rem' }}>
          {node.path[node.path.length - 1]}
        </FormLabel>
        {renderChildren(node)}
      </Box>
    )
  }

  return (
    <Box data-testid={`${testIdPrefix}-form`} sx={{ minWidth: 0 }}>
      {renderChildren(tree)}
    </Box>
  )
}
