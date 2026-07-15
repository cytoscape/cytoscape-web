import { describe, expect, it } from 'vitest'

// src/app-api/types/ApiResult.test.ts
import type { ApiResult } from './ApiResult'
import { ApiErrorCode, fail, isFail, isOk, ok } from './ApiResult'

describe('ApiResult helpers', () => {
  describe('ok()', () => {
    it('creates a void success result when called with no arguments', () => {
      const result = ok()
      expect(result.success).toBe(true)
      expect(result.data).toBeUndefined()
    })

    it('creates a typed success result with data', () => {
      const result = ok({ nodeId: '42' })
      expect(result.success).toBe(true)
      expect(result.data).toEqual({ nodeId: '42' })
    })

    it('preserves complex data types', () => {
      const data = { ids: ['1', '2'], count: 2 }
      const result = ok(data)
      expect(result.data).toEqual(data)
    })
  })

  describe('fail()', () => {
    it('creates a failure result with code and message', () => {
      const result = fail(ApiErrorCode.NetworkNotFound, 'Network abc not found')
      expect(result.success).toBe(false)
      expect(result.error.code).toBe('NETWORK_NOT_FOUND')
      expect(result.error.message).toBe('Network abc not found')
    })

    it('creates a failure result for each error code', () => {
      const codes = Object.values(ApiErrorCode)
      for (const code of codes) {
        const result = fail(code, `Error: ${code}`)
        expect(result.success).toBe(false)
        expect(result.error.code).toBe(code)
      }
    })

    it('tags the error with a CX2 validation code when provided', () => {
      const result = fail(
        ApiErrorCode.InvalidInput,
        'Attribute "id" is forbidden for nodes',
        'FK1',
      )
      expect(result.success).toBe(false)
      expect(result.error.code).toBe('INVALID_INPUT')
      expect(result.error.cx2Code).toBe('FK1')
    })

    it('omits cx2Code when not provided', () => {
      const result = fail(ApiErrorCode.InvalidInput, 'bad input')
      expect(result.error.cx2Code).toBeUndefined()
      expect(Object.keys(result.error)).not.toContain('cx2Code')
    })
  })

  describe('isOk()', () => {
    it('returns true for success results', () => {
      expect(isOk(ok())).toBe(true)
      expect(isOk(ok({ id: '1' }))).toBe(true)
    })

    it('returns false for failure results', () => {
      expect(isOk(fail(ApiErrorCode.InvalidInput, 'bad input'))).toBe(false)
    })
  })

  describe('isFail()', () => {
    it('returns true for failure results', () => {
      expect(isFail(fail(ApiErrorCode.OperationFailed, 'oops'))).toBe(true)
    })

    it('returns false for success results', () => {
      expect(isFail(ok())).toBe(false)
    })
  })

  describe('ApiErrorCode', () => {
    it('has the expected number of error codes', () => {
      const codes = Object.keys(ApiErrorCode)
      expect(codes.length).toBe(12)
    })

    it('has unique string values', () => {
      const values = Object.values(ApiErrorCode)
      const uniqueValues = new Set(values)
      expect(uniqueValues.size).toBe(values.length)
    })

    it('all values are UPPER_SNAKE_CASE strings', () => {
      const values = Object.values(ApiErrorCode)
      for (const value of values) {
        expect(value).toMatch(/^[A-Z][A-Z0-9_]+$/)
      }
    })
  })

  describe('type narrowing', () => {
    it('narrows to ApiSuccess when success is true', () => {
      const result: ApiResult<{ nodeId: string }> = ok({
        nodeId: '42',
      })
      if (result.success) {
        // TypeScript should narrow to ApiSuccess<{ nodeId: string }>
        const nodeId: string = result.data.nodeId
        expect(nodeId).toBe('42')
      }
    })

    it('narrows to ApiFailure when success is false', () => {
      const result: ApiResult<{ nodeId: string }> = fail(
        ApiErrorCode.NodeNotFound,
        'Not found',
      )
      if (!result.success) {
        // TypeScript should narrow to ApiFailure
        const code: string = result.error.code
        expect(code).toBe('NODE_NOT_FOUND')
      }
    })
  })
})
