import { describe, expect, it } from 'vitest'

import { ParameterUiType } from '../ParameterUiType'
import { SelectedDataType } from '../SelectedDataType'
import { ServiceAppParameter } from '../ServiceAppParameter'
import { ServiceInputDefinition } from '../ServiceInputDefinition'
import {
  buildCustomParameters,
  isAutoFilledParameter,
  ndexNetworkUrl,
  resolveParameterValue,
  sendsNoData,
  shouldShowServiceDescription,
  validateParameter,
} from './index'

const makeParam = (
  displayName: string,
  type: ParameterUiType,
  overrides: Partial<ServiceAppParameter> = {},
): ServiceAppParameter =>
  ({
    displayName,
    type,
    defaultValue: '',
    ...overrides,
  }) as ServiceAppParameter

describe('AppModel impl', () => {
  describe('ndexNetworkUrl', () => {
    it('builds the v3 network URL', () => {
      expect(ndexNetworkUrl('https://ndexbio.org', 'abc-123')).toBe(
        'https://ndexbio.org/v3/networks/abc-123',
      )
    })

    it('strips a trailing slash from the base url', () => {
      expect(ndexNetworkUrl('https://ndexbio.org/', 'abc-123')).toBe(
        'https://ndexbio.org/v3/networks/abc-123',
      )
    })
  })

  describe('isAutoFilledParameter', () => {
    it('marks ndexUUID as auto-filled', () => {
      expect(isAutoFilledParameter(ParameterUiType.NdexUuid)).toBe(true)
    })

    it('does not mark ordinary parameter types as auto-filled', () => {
      expect(isAutoFilledParameter(ParameterUiType.Text)).toBe(false)
      expect(isAutoFilledParameter(ParameterUiType.DropDown)).toBe(false)
    })
  })

  describe('resolveParameterValue', () => {
    it('resolves ndexUUID params from the context url', () => {
      const param = makeParam('net', ParameterUiType.NdexUuid)
      expect(
        resolveParameterValue(param, { ndexNetworkUrl: 'https://x/v3/networks/1' }),
      ).toBe('https://x/v3/networks/1')
    })

    it('resolves ndexUUID params to empty string when no url in context', () => {
      const param = makeParam('net', ParameterUiType.NdexUuid)
      expect(resolveParameterValue(param, {})).toBe('')
    })

    it('uses value then defaultValue for ordinary params', () => {
      expect(
        resolveParameterValue(
          makeParam('t', ParameterUiType.Text, { value: 'v' }),
          {},
        ),
      ).toBe('v')
      expect(
        resolveParameterValue(
          makeParam('t', ParameterUiType.Text, { defaultValue: 'd' }),
          {},
        ),
      ).toBe('d')
    })
  })

  describe('buildCustomParameters', () => {
    it('keys resolved values by displayName and injects auto-filled params', () => {
      const params = [
        makeParam('updatedBy', ParameterUiType.Text, { defaultValue: 'demo' }),
        makeParam('networkUrl', ParameterUiType.NdexUuid),
      ]
      expect(
        buildCustomParameters(params, { ndexNetworkUrl: 'https://x/v3/networks/1' }),
      ).toEqual({
        updatedBy: 'demo',
        networkUrl: 'https://x/v3/networks/1',
      })
    })

    it('returns an empty object for undefined parameters', () => {
      expect(buildCustomParameters(undefined, {})).toEqual({})
    })
  })

  describe('sendsNoData', () => {
    it('returns true when the input type is none', () => {
      expect(
        sendsNoData({ type: SelectedDataType.None } as ServiceInputDefinition),
      ).toBe(true)
    })

    it('returns false for node/edge/network input types', () => {
      expect(
        sendsNoData({ type: SelectedDataType.Node } as ServiceInputDefinition),
      ).toBe(false)
      expect(
        sendsNoData({
          type: SelectedDataType.Networks,
        } as ServiceInputDefinition),
      ).toBe(false)
    })

    it('returns false when there is no input definition', () => {
      expect(sendsNoData(undefined)).toBe(false)
    })
  })

  describe('shouldShowServiceDescription', () => {
    it('shows a non-empty description by default', () => {
      expect(shouldShowServiceDescription('Does a thing', undefined)).toBe(true)
    })

    it('shows a non-empty description when the flag is true', () => {
      expect(shouldShowServiceDescription('Does a thing', true)).toBe(true)
    })

    it('hides the description when the flag is explicitly false', () => {
      expect(shouldShowServiceDescription('Does a thing', false)).toBe(false)
    })

    it('hides when the description is missing or blank', () => {
      expect(shouldShowServiceDescription(undefined, undefined)).toBe(false)
      expect(shouldShowServiceDescription(null, undefined)).toBe(false)
      expect(shouldShowServiceDescription('   ', undefined)).toBe(false)
    })
  })

  describe('validateParameter', () => {
    it('should return true if no regex is provided', () => {
      const parameter: ServiceAppParameter = {
        displayName: 'test',
        type: ParameterUiType.Text,
        defaultValue: 'value',
        validationRegex: '',
      } as any
      expect(validateParameter(parameter)).toBe(true)
    })

    it('should return true if value matches regex', () => {
      const parameter: ServiceAppParameter = {
        displayName: 'test',
        type: ParameterUiType.Text,
        defaultValue: 'value',
        validationRegex: '^v.*e$',
      } as any
      expect(validateParameter(parameter)).toBe(true)
    })

    it('should return false if value does not match regex', () => {
      const parameter: ServiceAppParameter = {
        displayName: 'test',
        type: ParameterUiType.Text,
        defaultValue: 'wrong',
        validationRegex: '^v.*e$',
      } as any
      expect(validateParameter(parameter)).toBe(false)
    })

    it('should use current value if provided', () => {
      const parameter: ServiceAppParameter = {
        displayName: 'test',
        type: ParameterUiType.Text,
        defaultValue: 'wrong',
        value: 'value',
        validationRegex: '^v.*e$',
      } as any
      expect(validateParameter(parameter)).toBe(true)
    })

    it('should handle invalid regex by returning true', () => {
      const parameter: ServiceAppParameter = {
        displayName: 'test',
        type: ParameterUiType.Text,
        defaultValue: 'value',
        validationRegex: '[',
      } as any
      expect(validateParameter(parameter)).toBe(true)
    })

    it('should return true for non-text parameters', () => {
      const parameter: ServiceAppParameter = {
        displayName: 'test',
        type: ParameterUiType.DropDown,
        defaultValue: 'value',
        validationRegex: 'nomatch',
      } as any
      expect(validateParameter(parameter)).toBe(true)
    })
    it('should return false if regex is longer than 1000 characters', () => {
      const longRegex = 'a'.repeat(1001)
      const parameter: ServiceAppParameter = {
        displayName: 'test',
        type: ParameterUiType.Text,
        defaultValue: 'value',
        validationRegex: longRegex,
      } as any
      expect(validateParameter(parameter)).toBe(false)
    })

    it('should return false if regex is unsafe (e.g. (a+)+)', () => {
      const parameter: ServiceAppParameter = {
        displayName: 'test',
        type: ParameterUiType.Text,
        defaultValue: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaac',
        validationRegex: '(a+)+$',
      } as any
      expect(validateParameter(parameter)).toBe(false)
    })
  })
})
