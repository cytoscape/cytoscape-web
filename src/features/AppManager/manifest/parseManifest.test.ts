// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { parseManifest } from './parseManifest'

describe('parseManifest', () => {
  it('returns entries for valid manifest with id, url, and author', () => {
    const data = [
      {
        id: 'app1',
        url: 'http://localhost:2222/remoteEntry.js',
        author: 'Dev',
      },
    ]
    const result = parseManifest(data)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('app1')
    expect(result[0].url).toBe('http://localhost:2222/remoteEntry.js')
    expect(result[0].author).toBe('Dev')
  })

  it('uses name as id when id is absent (backward compat)', () => {
    const data = [
      { name: 'hello', url: 'http://localhost:2222/remoteEntry.js' },
    ]
    const result = parseManifest(data)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('hello')
    expect(result[0].name).toBe('hello')
  })

  it('defaults author to "unknown" when missing (backward compat)', () => {
    const data = [
      { name: 'hello', url: 'http://localhost:2222/remoteEntry.js' },
    ]
    const result = parseManifest(data)
    expect(result[0].author).toBe('unknown')
  })

  it('defaults author to "unknown" when it is an empty string', () => {
    // The App Store serves "" for optional fields the developer left blank
    // (apps-stage c3app). An empty string is present, so .optional() and
    // .default() never fire and the whole entry was being skipped.
    const data = [
      {
        id: 'c3app',
        name: 'C3 App',
        url: 'https://apps-stage.cytoscape.org/web/c3app/0.1.0/remoteEntry.js',
        author: '',
      },
    ]
    const result = parseManifest(data)
    expect(result).toHaveLength(1)
    expect(result[0].author).toBe('unknown')
  })

  it('defaults author to "unknown" when it is only whitespace', () => {
    const data = [
      { id: 'app1', url: 'http://localhost:2222/remoteEntry.js', author: '  ' },
    ]
    const result = parseManifest(data)
    expect(result).toHaveLength(1)
    expect(result[0].author).toBe('unknown')
  })

  it('skips entry missing both id and name', () => {
    const data = [{ url: 'http://localhost:2222/remoteEntry.js' }]
    const result = parseManifest(data)
    expect(result).toHaveLength(0)
  })

  it('skips entry with invalid id pattern', () => {
    const data = [
      { id: '123-invalid', url: 'http://localhost:2222/remoteEntry.js' },
    ]
    const result = parseManifest(data)
    expect(result).toHaveLength(0)
  })

  it('skips entry with name that is not a valid identifier when id is absent', () => {
    const data = [
      { name: 'my-app', url: 'http://localhost:2222/remoteEntry.js' },
    ]
    const result = parseManifest(data)
    expect(result).toHaveLength(0)
  })

  it('skips entry with invalid url', () => {
    const data = [{ id: 'app1', url: 'not-a-url' }]
    const result = parseManifest(data)
    expect(result).toHaveLength(0)
  })

  it('keeps first occurrence on duplicate id', () => {
    const data = [
      {
        id: 'app1',
        url: 'http://localhost:1111/remoteEntry.js',
        author: 'First',
      },
      {
        id: 'app1',
        url: 'http://localhost:2222/remoteEntry.js',
        author: 'Second',
      },
    ]
    const result = parseManifest(data)
    expect(result).toHaveLength(1)
    expect(result[0].author).toBe('First')
  })

  it('returns empty array for non-array input', () => {
    expect(parseManifest('not an array')).toEqual([])
    expect(parseManifest(null)).toEqual([])
    expect(parseManifest(undefined)).toEqual([])
    expect(parseManifest(42)).toEqual([])
    expect(parseManifest({ key: 'value' })).toEqual([])
  })

  it('returns empty array for empty array input', () => {
    expect(parseManifest([])).toEqual([])
  })

  it('warns on self-referencing dependencies (no runtime enforcement)', () => {
    const data = [
      {
        id: 'app1',
        url: 'http://localhost:2222/remoteEntry.js',
        dependencies: ['app1'],
      },
    ]
    const result = parseManifest(data)
    expect(result).toHaveLength(1)
    expect(result[0].dependencies).toEqual(['app1'])
  })

  it('warns on unknown dependency IDs (no runtime enforcement)', () => {
    const data = [
      {
        id: 'app1',
        url: 'http://localhost:2222/remoteEntry.js',
        dependencies: ['nonexistent'],
      },
    ]
    const result = parseManifest(data)
    expect(result).toHaveLength(1)
    expect(result[0].dependencies).toEqual(['nonexistent'])
  })

  it('returns valid entries and skips invalid in mixed input', () => {
    const data = [
      { id: 'validApp', url: 'http://localhost:2222/remoteEntry.js' },
      { url: 'not-a-url' },
      { name: 'anotherValid', url: 'http://localhost:3333/remoteEntry.js' },
      { id: '0invalid', url: 'http://localhost:4444/remoteEntry.js' },
    ]
    const result = parseManifest(data)
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('validApp')
    expect(result[1].id).toBe('anotherValid')
  })

  it('preserves optional metadata fields when present', () => {
    const data = [
      {
        id: 'app1',
        url: 'http://localhost:2222/remoteEntry.js',
        author: 'Dev',
        tags: ['analysis', 'network'],
        icon: 'http://example.com/icon.png',
        license: 'MIT',
        repository: 'http://github.com/org/repo',
        compatibleHostVersions: '>=1.0.0',
        description: 'A test app',
        version: '1.2.3',
      },
    ]
    const result = parseManifest(data)
    expect(result).toHaveLength(1)
    expect(result[0].tags).toEqual(['analysis', 'network'])
    expect(result[0].icon).toBe('http://example.com/icon.png')
    expect(result[0].license).toBe('MIT')
    expect(result[0].repository).toBe('http://github.com/org/repo')
    expect(result[0].compatibleHostVersions).toBe('>=1.0.0')
    expect(result[0].description).toBe('A test app')
    expect(result[0].version).toBe('1.2.3')
  })

  it('omits optional metadata fields when absent', () => {
    const data = [{ id: 'app1', url: 'http://localhost:2222/remoteEntry.js' }]
    const result = parseManifest(data)
    expect(result[0].tags).toBeUndefined()
    expect(result[0].icon).toBeUndefined()
    expect(result[0].license).toBeUndefined()
    expect(result[0].repository).toBeUndefined()
    expect(result[0].compatibleHostVersions).toBeUndefined()
  })

  it('skips entry with invalid icon URL', () => {
    const data = [
      {
        id: 'app1',
        url: 'http://localhost:2222/remoteEntry.js',
        icon: 'not-a-url',
      },
    ]
    const result = parseManifest(data)
    expect(result).toHaveLength(0)
  })

  it('skips entry with invalid repository URL', () => {
    const data = [
      {
        id: 'app1',
        url: 'http://localhost:2222/remoteEntry.js',
        repository: 'not-a-url',
      },
    ]
    const result = parseManifest(data)
    expect(result).toHaveLength(0)
  })

  it('omits icon when it is an empty string', () => {
    const data = [
      { id: 'app1', url: 'http://localhost:2222/remoteEntry.js', icon: '' },
    ]
    const result = parseManifest(data)
    expect(result).toHaveLength(1)
    expect(result[0].icon).toBeUndefined()
  })

  it('omits repository when it is an empty string', () => {
    const data = [
      {
        id: 'app1',
        url: 'http://localhost:2222/remoteEntry.js',
        repository: '',
      },
    ]
    const result = parseManifest(data)
    expect(result).toHaveLength(1)
    expect(result[0].repository).toBeUndefined()
  })

  it('omits name when it is an empty string and id is present', () => {
    const data = [
      { id: 'app1', url: 'http://localhost:2222/remoteEntry.js', name: '' },
    ]
    const result = parseManifest(data)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('app1')
    expect(result[0].name).toBeUndefined()
  })

  it('omits name when it is only whitespace and id is present', () => {
    const data = [
      { id: 'app1', url: 'http://localhost:2222/remoteEntry.js', name: '  ' },
    ]
    const result = parseManifest(data)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBeUndefined()
  })

  it('skips entry whose only identifier is a blank name', () => {
    const data = [{ name: '', url: 'http://localhost:2222/remoteEntry.js' }]
    const result = parseManifest(data)
    expect(result).toHaveLength(0)
  })

  it('accepts an entry blank across every optional string field', () => {
    // The shape the App Store publishes for a developer who filled in only the
    // required fields (apps-stage c3app).
    const data = [
      {
        id: 'c3App',
        name: 'C3 App',
        version: '0.1.0',
        url: 'https://apps-stage.cytoscape.org/web/c3app/0.1.0/remoteEntry.js',
        author: '',
        description: '',
        license: '',
        icon: '',
        repository: '',
        tags: [],
      },
    ]
    const result = parseManifest(data)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('c3App')
    expect(result[0].name).toBe('C3 App')
    expect(result[0].author).toBe('unknown')
    expect(result[0].icon).toBeUndefined()
    expect(result[0].repository).toBeUndefined()
  })

  it('skips entry with an empty url', () => {
    const data = [{ id: 'app1', url: '' }]
    const result = parseManifest(data)
    expect(result).toHaveLength(0)
  })

  it('skips entry with a whitespace-only url', () => {
    const data = [{ id: 'app1', url: '   ' }]
    const result = parseManifest(data)
    expect(result).toHaveLength(0)
  })
})
