// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useMessageStore } from '../../../data/hooks/stores/MessageStore'
import { MessageSeverity } from '../../../models/MessageModel'
import type { NetworkSummary } from '../../../models/NetworkSummaryModel'
import { createTable } from '../../../models/TableModel/impl/inMemoryTable'
import type { HcxValidationResult } from '../model/HcxValidator'
import { validateHcx } from '../model/impl/hcxValidators'
import { useHcxValidatorStore } from '../store/HcxValidatorStore'
import {
  INVALID_HCX_MESSAGE,
  INVALID_HCX_WARNING_DURATION_MS,
  validateAndRecordHcx,
} from './validateAndRecordHcx'

vi.mock('../model/impl/hcxValidators', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../model/impl/hcxValidators')>()
  return { ...actual, validateHcx: vi.fn(actual.validateHcx) }
})

const NET_ID = 'net-1'

const makeSummary = (
  properties: NetworkSummary['properties'] = [],
): NetworkSummary => ({ properties }) as unknown as NetworkSummary

const result = (isValid: boolean): HcxValidationResult => ({
  isValid,
  warnings: isValid ? [] : ['broken'],
  version: 'hierarchy_v0.1',
})

describe('validateAndRecordHcx', () => {
  beforeEach(() => {
    vi.mocked(validateHcx).mockReset()
    useMessageStore.setState((state) => {
      state.messages = []
    })
    useHcxValidatorStore.setState((state) => {
      state.validationResults = {}
    })
  })

  it('posts the one warning and records the result for an invalid network', () => {
    vi.mocked(validateHcx).mockReturnValue(result(false))

    const returned = validateAndRecordHcx(
      NET_ID,
      makeSummary(),
      createTable(NET_ID),
    )

    expect(returned.isValid).toBe(false)
    expect(useHcxValidatorStore.getState().validationResults[NET_ID]).toEqual(
      returned,
    )
    const { messages } = useMessageStore.getState()
    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatchObject({
      message: INVALID_HCX_MESSAGE,
      duration: INVALID_HCX_WARNING_DURATION_MS,
      severity: MessageSeverity.WARNING,
    })
  })

  it('records a valid result without posting any message', () => {
    vi.mocked(validateHcx).mockReturnValue(result(true))

    validateAndRecordHcx(NET_ID, makeSummary(), createTable(NET_ID))

    expect(
      useHcxValidatorStore.getState().validationResults[NET_ID].isValid,
    ).toBe(true)
    expect(useMessageStore.getState().messages).toHaveLength(0)
  })

  it('passes the ndexSchema version to the validator, or empty when absent', () => {
    vi.mocked(validateHcx).mockReturnValue(result(true))
    const nodeTable = createTable(NET_ID)

    validateAndRecordHcx(
      NET_ID,
      makeSummary([
        { predicateString: 'ndexSchema', value: 'hierarchy_v0.1' },
      ] as unknown as NetworkSummary['properties']),
      nodeTable,
    )
    validateAndRecordHcx(NET_ID, makeSummary(), nodeTable)

    expect(vi.mocked(validateHcx).mock.calls[0][0]).toBe('hierarchy_v0.1')
    expect(vi.mocked(validateHcx).mock.calls[1][0]).toBe('')
  })

  it('tolerates a summary without properties (malformed external data)', () => {
    vi.mocked(validateHcx).mockReturnValue(result(false))

    expect(() =>
      validateAndRecordHcx(
        NET_ID,
        {} as unknown as NetworkSummary,
        createTable(NET_ID),
      ),
    ).not.toThrow()
    expect(vi.mocked(validateHcx).mock.calls[0][0]).toBe('')
  })
})
