import { describe, expect, it } from 'vitest'

// src/app-api/types/ApiResult.test.ts
import type { ApiResult } from './ApiResult'
import {
  AppCodes,
  ElementCodes,
  fail,
  isFail,
  isOk,
  ok,
  StyleCodes,
  TableCodes,
} from './ApiResult'

const ALL_CATALOGS = { ElementCodes, TableCodes, StyleCodes, AppCodes }

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
    it('creates a failure result from a code definition with no template args', () => {
      const result = fail(AppCodes.NO_CURRENT_NETWORK)
      expect(result.success).toBe(false)
      expect(result.error.code).toBe('APP2')
      expect(result.error.severity).toBe('error')
      expect(result.error.message).toBe(
        'No network is currently selected in the workspace',
      )
    })

    it('resolves a template-function message with its arguments', () => {
      const result = fail(AppCodes.NETWORK_NOT_FOUND, 'net1')
      expect(result.success).toBe(false)
      expect(result.error.code).toBe('APP1')
      expect(result.error.message).toBe('Network net1 not found')
    })

    it('copies severity onto the runtime error, including warning severity', () => {
      const result = fail(StyleCodes.MAPPING_ATTRIBUTE_UNDECLARED, 'score', 'node')
      expect(result.success).toBe(false)
      expect(result.error.severity).toBe('warning')
    })

    it('reuses the CX2 code string verbatim for CX2-derived codes', () => {
      expect(fail(TableCodes.NODE_ID_COLUMN_FORBIDDEN).error.code).toBe('FK1')
      expect(fail(ElementCodes.NODE_NOT_FOUND, 'n1').error.code).toBe('GL1')
      expect(fail(StyleCodes.BYPASS_TARGET_NOT_FOUND, 'n1').error.code).toBe(
        'BV1',
      )
    })
  })

  describe('isOk()', () => {
    it('returns true for success results', () => {
      expect(isOk(ok())).toBe(true)
      expect(isOk(ok({ id: '1' }))).toBe(true)
    })

    it('returns false for failure results', () => {
      expect(isOk(fail(AppCodes.INVALID_INPUT, 'bad input'))).toBe(false)
    })
  })

  describe('isFail()', () => {
    it('returns true for failure results', () => {
      expect(isFail(fail(AppCodes.OPERATION_FAILED, 'oops'))).toBe(true)
    })

    it('returns false for success results', () => {
      expect(isFail(ok())).toBe(false)
    })
  })

  describe('code catalogs', () => {
    const allEntries = Object.entries(ALL_CATALOGS).flatMap(
      ([groupName, group]) =>
        Object.entries(group).map(([memberName, def]) => ({
          groupName,
          memberName,
          def,
        })),
    )

    it('has at least one code in each catalog group', () => {
      for (const group of Object.values(ALL_CATALOGS)) {
        expect(Object.keys(group).length).toBeGreaterThan(0)
      }
    })

    it('every code string is unique across all catalogs', () => {
      const codes = allEntries.map((e) => e.def.code)
      expect(new Set(codes).size).toBe(codes.length)
    })

    it('every entry has a valid severity', () => {
      for (const { def } of allEntries) {
        expect(['error', 'warning']).toContain(def.severity)
      }
    })

    it('every entry has a non-empty message (string or template function)', () => {
      for (const { def } of allEntries) {
        expect(['string', 'function']).toContain(typeof def.message)
        if (typeof def.message === 'string') {
          expect(def.message.length).toBeGreaterThan(0)
        }
      }
    })

    it('APP* codes are distinct from every CX2-derived code prefix', () => {
      for (const { groupName, def } of allEntries) {
        if (groupName === 'AppCodes') {
          expect(def.code).toMatch(/^APP\d+$/)
        } else {
          expect(def.code).not.toMatch(/^APP\d+$/)
        }
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
        ElementCodes.NODE_NOT_FOUND,
        'n1',
      )
      if (!result.success) {
        // TypeScript should narrow to ApiFailure
        const code: string = result.error.code
        expect(code).toBe('GL1')
      }
    })
  })
})
