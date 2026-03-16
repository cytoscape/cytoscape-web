import { ParameterUiType } from '../ParameterUiType'
import { ServiceAppParameter } from '../ServiceAppParameter'
import { validateParameter } from './index'

describe('AppModel impl', () => {
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
  })
})
