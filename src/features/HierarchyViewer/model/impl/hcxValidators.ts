import { HcxValidationResult } from '../HcxValidator'
import { HcxVersion } from '../HcxVersion'

import { NdexNetworkSummary } from '../../../../models/NetworkSummaryModel'
import { Table } from '../../../../models/TableModel'
import { HcxMetaTag, SubsystemTag } from '../HcxMetaTag'

import config from '../../../../assets/config.json'

export const HCX_VERSION_0_1: HcxVersion = 'hierarchy_v0.1'

export const isValidHcxVersion = (version: string): boolean => {
  if (typeof version !== 'string') return false
  return version.startsWith('hierarchy_v')
}

export const hcxVersionValidators = {
  [HCX_VERSION_0_1]: {
    version: HCX_VERSION_0_1,
    validate: (
      summary: NdexNetworkSummary,
      nodeTable: Table,
    ): HcxValidationResult => {
      const warnings: string[] = []
      let isValid = true
      const version =
        summary.properties.find(
          (p) => p.predicateString === HcxMetaTag.ndexSchema,
        )?.value ?? ''

      if (!isValidHcxVersion(version as string)) {
        warnings.push(
          `The '${
            HcxMetaTag.ndexSchema
          }' network attribute must be a string that starts with the prefix 'hierarchy_v'.  E.g. hierarchy_v0.1.  Instead, received ${
            version as string
          }`,
        )
        isValid = false
      }

      if (version !== HCX_VERSION_0_1) {
        warnings.push(
          `Unsupported hcx version found in the '${
            HcxMetaTag.ndexSchema
          }' network attribute: ${String(
            version,
          )}.  Supported hcx versions are: ${HCX_VERSION_0_1}`,
        )
        isValid = false
      }

      const rows = nodeTable.rows ?? new Map()
      const columns = nodeTable.columns ?? []
      const memberNames = columns.find(
        (c) => c.name === SubsystemTag.memberNames,
      )
      const members = columns.find((c) => c.name === SubsystemTag.members)

      if (members === undefined && memberNames === undefined) {
        warnings.push(
          `A column named ${SubsystemTag.memberNames} or ${SubsystemTag.members} must exist in the node table`,
        )
        isValid = false
      }

      if (members !== undefined) {
        const interactionNetworkUUID = summary.properties.find(
          (p) => p.predicateString === HcxMetaTag.interactionNetworkUUID,
        )?.value
        if (interactionNetworkUUID === undefined) {
          warnings.push(
            `When HCX networks have the column ${SubsystemTag.members} defined, a property named ${HcxMetaTag.interactionNetworkUUID} with a valid network id from ${config.ndexBaseUrl} must also be defined in the network attributes`,
          )
          isValid = false
        }

        const invalidRows = []
        for (const [k, v] of rows.entries()) {
          const member = v[SubsystemTag.members]
          if (member === undefined) {
            invalidRows.push(k)
          }
        }

        if (invalidRows.length > 0) {
          warnings.push(
            `The following rows in the node table are missing a value for ${
              SubsystemTag.members
            }: ${invalidRows.join(', ')}`,
          )
          isValid = false
        }
      }

      if (memberNames !== undefined) {
        const interactionNetworkUUID = summary.properties.find(
          (p) => p.predicateString === HcxMetaTag.interactionNetworkUUID,
        )?.value
        if (interactionNetworkUUID === undefined) {
          warnings.push(
            `When HCX networks have the column ${SubsystemTag.memberNames} defined, a property named ${HcxMetaTag.interactionNetworkUUID} with a valid network id from ${config.ndexBaseUrl} must also be defined in the network attributes`,
          )
          isValid = false
        }

        const invalidRows = []
        for (const [k, v] of rows.entries()) {
          const memberNames = v[SubsystemTag.memberNames]
          if (memberNames === undefined) {
            invalidRows.push(k)
          }
        }

        if (invalidRows.length > 0) {
          warnings.push(
            `The following rows in the node table are missing a value for ${
              SubsystemTag.memberNames
            }: ${invalidRows.join(', ')}`,
          )
          isValid = false
        }
      }

      return {
        isValid,
        version: version as HcxVersion,
        warnings,
      }
    },
  },
}

export const validateHcx = (
  version: string,
  summary: NdexNetworkSummary,
  nodeTable: Table,
): HcxValidationResult => {
  const validator = hcxVersionValidators[version]
  if (validator === undefined) {
    return {
      isValid: false,
      version,
      warnings: [`Unsupported hcx version: ${version}`],
    }
  }
  return validator.validate(summary, nodeTable)
}
