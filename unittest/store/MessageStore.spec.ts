import { act, renderHook } from '@testing-library/react'
import { useMessageStore } from '../../src/store/MessageStore'
import { Message } from '../../src/models/MessageModel'

describe('useMessageStore', () => {
  it('should add a message to the store', () => {
    const message: Message = {
      message: 'Hello world',
      duration: 5000,
    }

    const { result } = renderHook(() => useMessageStore())

    act(() => {
      result.current.addMessage(message)
    })

    expect(result.current.messages).toEqual([message])
  })
})