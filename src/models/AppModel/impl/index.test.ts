import { describe, expect, it } from 'vitest'

import { ParameterUiType } from '../ParameterUiType'
import { ServiceAppParameter } from '../ServiceAppParameter'
import { shouldShowServiceDescription, validateParameter } from './index'

describe('AppModel impl', () => {
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
