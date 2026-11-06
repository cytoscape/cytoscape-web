import { afterEach, describe, expect, it, vi } from 'vitest'

import { readFileAsText } from './readFileAsText'

describe('readFileAsText', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('resolves the text of the file', async () => {
    const file = new File(['source,target\na,b\n'], 'table.csv')
    await expect(readFileAsText(file)).resolves.toBe('source,target\na,b\n')
  })

  it('decodes a UTF-16 file that starts with a byte-order mark', async () => {
    const text = 'source\ttarget\nα\tβ\n'
    const utf16 = new Uint8Array(2 + text.length * 2)
    utf16.set([0xff, 0xfe])
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i)
      utf16[2 + i * 2] = code & 0xff
      utf16[3 + i * 2] = code >> 8
    }
    await expect(readFileAsText(new File([utf16], 'table.txt'))).resolves.toBe(
      text,
    )
  })

  it('rejects when the file cannot be read', async () => {
    vi.spyOn(FileReader.prototype, 'readAsText').mockImplementation(function (
      this: FileReader,
    ) {
      setTimeout(() => this.dispatchEvent(new ProgressEvent('error')))
    })
    const outcome = await readFileAsText(new File(['a'], 'gone.csv')).then(
      () => 'read',
      () => 'rejected',
    )
    expect(outcome).toBe('rejected')
  })
})
