import { removePTags } from './removePTags'

describe('removePTags', () => {
  it.each([
    ['<p>text</p>', 'text'],
    ['<p>Hello World</p>', 'Hello World'],
    ['text<p>content</p>', 'textcontent'],
    ['<p>start</p>content<p>end</p>', 'startcontentend'],
  ])('should remove basic <p> tags from "%s"', (input, expected) => {
    expect(removePTags(input)).toBe(expected)
  })

  it.each([
    ['<p class="test">text</p>', 'text'],
    ['<p id="foo">content</p>', 'content'],
    ['<p class="bar" id="baz">text</p>', 'text'],
    ['<p style="color: red;">content</p>', 'content'],
  ])('should remove <p> tags with attributes from "%s"', (input, expected) => {
    expect(removePTags(input)).toBe(expected)
  })

  it.each([
    ['</p>', ''],
    ['</p>content', 'content'],
    ['start</p>', 'start'],
    ['<p>content</p>', 'content'],
  ])('should handle closing tags in "%s"', (input, expected) => {
    expect(removePTags(input)).toBe(expected)
  })

  it('should handle multiple p tags', () => {
    const input = '<p>first</p><p>second</p><p>third</p>'
    expect(removePTags(input)).toBe('firstsecondthird')
  })

  it('should handle mixed opening and closing tags', () => {
    const input = '<p>content</p>some text<p>more</p>'
    expect(removePTags(input)).toBe('contentsome textmore')
  })

  it('should handle empty string', () => {
    expect(removePTags('')).toBe('')
  })

  it('should handle string with no p tags', () => {
    const input = 'This is plain text without any tags'
    expect(removePTags(input)).toBe(input)
  })

  it('should handle self-closing p tags if present', () => {
    const input = '<p />content<p />'
    expect(removePTags(input)).toBe('content')
  })

  it('should handle nested p tags (removes all)', () => {
    const input = '<p>outer<p>inner</p></p>'
    expect(removePTags(input)).toBe('outerinner')
  })

  it('should handle malformed p tags', () => {
    const input = '<p>content<p'
    expect(removePTags(input)).toBe('content<p')
  })

  it('should handle real-world HTML content', () => {
    const input =
      '<p class="description">This is a description</p><p>Another paragraph</p>'
    expect(removePTags(input)).toBe('This is a descriptionAnother paragraph')
  })

  it('should handle p tags with whitespace', () => {
    const input = '<p >content</p>'
    expect(removePTags(input)).toBe('content')
  })

  it('should preserve content between tags', () => {
    const input = '<p>before</p>middle<p>after</p>'
    expect(removePTags(input)).toBe('beforemiddleafter')
  })

  it('should not remove uppercase P tags (regex is case-sensitive)', () => {
    const input = '<P>content</P>'
    expect(removePTags(input)).toBe(input) // Function only matches lowercase 'p'
  })

  it('should not remove mixed case closing tags', () => {
    const input = '<p>content</P>'
    expect(removePTags(input)).toBe('content</P>') // Only opening tag removed
  })
})
