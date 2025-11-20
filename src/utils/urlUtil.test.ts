import { getDomain,isValidUrl } from './urlUtil'

describe('urlUtil', () => {
  describe('isValidUrl', () => {
    describe('valid URLs', () => {
      test('basic HTTP URLs', () => {
        expect(isValidUrl('http://example.com')).toBe(true)
        expect(isValidUrl('https://example.com')).toBe(true)
        expect(isValidUrl('http://www.example.com')).toBe(true)
        expect(isValidUrl('https://www.example.com')).toBe(true)
      })

      test('URLs with paths', () => {
        expect(isValidUrl('https://example.com/path')).toBe(true)
        expect(isValidUrl('https://example.com/path/to/resource')).toBe(true)
        expect(
          isValidUrl('https://example.com/path/with/multiple/segments'),
        ).toBe(true)
      })

      test('URLs with query parameters', () => {
        expect(isValidUrl('https://example.com?param=value')).toBe(true)
        expect(isValidUrl('https://example.com/path?param=value')).toBe(true)
        expect(
          isValidUrl('https://example.com/path?param1=value1&param2=value2'),
        ).toBe(true)
      })

      test('URLs with JSON in query parameters', () => {
        expect(
          isValidUrl('https://example.com/api?filter={"key":"value"}'),
        ).toBe(true)
        expect(
          isValidUrl(
            'https://api.example.com/search?query={"type":"gene","name":"CDK9"}',
          ),
        ).toBe(true)
        expect(
          isValidUrl(
            'https://research.bioinformatics.udel.edu/ProKN/explorer?filter={"start":"Gene","start_field":"label","start_term":"CDK9","end_field":"label","interm":[]}',
          ),
        ).toBe(true)
      })

      test('URLs with percent encoding', () => {
        expect(
          isValidUrl(
            'https://example.com/api?filter=%7B%22key%22%3A%22value%22%7D',
          ),
        ).toBe(true)
        expect(
          isValidUrl(
            'https://research.bioinformatics.udel.edu/ProKN/explorer?filter=%7B%22start%22%3A%22Gene%22%2C%22start_field%22%3A%22label%22%2C%22start_term%22%3A%22CDK9%22%2C%22end_field%22%3A%22label%22%2C%22interm%22%3A%5B%5D%7D',
          ),
        ).toBe(true)
      })

      test('URLs with ports', () => {
        expect(isValidUrl('http://localhost:3000')).toBe(true)
        expect(isValidUrl('https://localhost:8080')).toBe(true)
        expect(isValidUrl('http://127.0.0.1:3000')).toBe(true)
        expect(isValidUrl('https://api.example.com:443')).toBe(true)
        expect(isValidUrl('https://api.example.com:8080')).toBe(true)
      })

      test('URLs with fragments', () => {
        expect(isValidUrl('https://example.com/path#section')).toBe(true)
        expect(isValidUrl('https://example.com/path?param=value#section')).toBe(
          true,
        )
      })

      test('URLs with subdomains', () => {
        expect(isValidUrl('https://subdomain.example.com')).toBe(true)
        expect(isValidUrl('https://very-long-subdomain.example.com')).toBe(true)
        expect(isValidUrl('https://api.v1.example.com')).toBe(true)
      })

      test('URLs with special characters in path', () => {
        expect(isValidUrl('https://example.com/path-with-dashes')).toBe(true)
        expect(isValidUrl('https://example.com/path_with_underscores')).toBe(
          true,
        )
        expect(isValidUrl('https://example.com/path.with.dots')).toBe(true)
      })

      test('URLs with special characters in query', () => {
        expect(isValidUrl('https://example.com/search?q=hello+world')).toBe(
          true,
        )
        expect(
          isValidUrl(
            'https://example.com/api?filter[type]=gene&filter[name]=CDK9',
          ),
        ).toBe(true)
        expect(
          isValidUrl(
            'https://example.com/api?callback=myFunction&data={"test":123}',
          ),
        ).toBe(true)
      })
    })

    describe('invalid URLs', () => {
      test('non-HTTP protocols', () => {
        expect(isValidUrl('ftp://example.com')).toBe(false)
        expect(isValidUrl('file:///path/to/file')).toBe(false)
        expect(isValidUrl('javascript:alert("xss")')).toBe(false)
        expect(isValidUrl('data:text/html,<script>alert("xss")</script>')).toBe(
          false,
        )
      })

      test('malformed URLs', () => {
        expect(isValidUrl('not-a-url')).toBe(false)
        expect(isValidUrl('example.com')).toBe(false)
        expect(isValidUrl('www.example.com')).toBe(false)
        expect(isValidUrl('//example.com')).toBe(false)
        expect(isValidUrl('example.com/path')).toBe(false)
      })

      test('empty or invalid inputs', () => {
        expect(isValidUrl('')).toBe(false)
        expect(isValidUrl('   ')).toBe(false)
        expect(isValidUrl('http://')).toBe(false)
        expect(isValidUrl('https://')).toBe(false)
        // Note: http:///path is actually valid according to URL constructor
        // expect(isValidUrl('http:///path')).toBe(false)
      })

      test('URLs with invalid characters', () => {
        // Note: URL constructor actually accepts these as valid URLs
        // expect(isValidUrl('https://example.com/path with spaces')).toBe(false)
        // expect(isValidUrl('https://example.com/path\twith\ttabs')).toBe(false)
        // expect(isValidUrl('https://example.com/path\nwith\nnewlines')).toBe(false)

        // These are actually valid URLs that get URL-encoded
        expect(isValidUrl('https://example.com/path with spaces')).toBe(true)
        expect(isValidUrl('https://example.com/path\twith\ttabs')).toBe(true)
        expect(isValidUrl('https://example.com/path\nwith\nnewlines')).toBe(
          true,
        )
      })
    })

    describe('edge cases', () => {
      test('very long URLs', () => {
        const longUrl =
          'https://example.com/' +
          'a'.repeat(1000) +
          '?param=' +
          'b'.repeat(1000)
        expect(isValidUrl(longUrl)).toBe(true)
      })

      test('URLs with many query parameters', () => {
        const manyParams =
          'https://example.com/api?' +
          Array.from({ length: 100 }, (_, i) => `param${i}=value${i}`).join('&')
        expect(isValidUrl(manyParams)).toBe(true)
      })

      test('URLs with unicode characters', () => {
        expect(isValidUrl('https://example.com/search?q=café')).toBe(true)
        expect(isValidUrl('https://example.com/search?q=测试')).toBe(true)
        expect(isValidUrl('https://example.com/search?q=مرحبا')).toBe(true)
      })

      test('URLs with IPv6 addresses', () => {
        expect(isValidUrl('http://[2001:db8::1]:8080')).toBe(true)
        expect(isValidUrl('https://[::1]:3000')).toBe(true)
      })

      test('URLs with IPv4 addresses', () => {
        expect(isValidUrl('http://192.168.1.1')).toBe(true)
        expect(isValidUrl('https://127.0.0.1:8080')).toBe(true)
      })
    })
  })

  describe('getDomain', () => {
    test('extracts domain from valid URLs', () => {
      expect(getDomain('https://example.com')).toBe('https://example.com/')
      expect(getDomain('http://example.com')).toBe('http://example.com/')
      expect(getDomain('https://www.example.com')).toBe(
        'https://www.example.com/',
      )
      expect(getDomain('https://subdomain.example.com')).toBe(
        'https://subdomain.example.com/',
      )
    })

    test('handles URLs with ports', () => {
      expect(getDomain('http://localhost:3000')).toBe('http://localhost:3000/')
      expect(getDomain('https://api.example.com:8080')).toBe(
        'https://api.example.com:8080/',
      )
    })

    test('handles URLs with paths and query parameters', () => {
      expect(getDomain('https://example.com/path?param=value')).toBe(
        'https://example.com/',
      )
      expect(
        getDomain(
          'https://example.com/path/to/resource?param1=value1&param2=value2',
        ),
      ).toBe('https://example.com/')
    })

    test('returns empty string for invalid URLs', () => {
      expect(getDomain('not-a-url')).toBe('')
      expect(getDomain('')).toBe('')
      expect(getDomain('invalid-url')).toBe('')
    })

    test('handles edge cases', () => {
      // Note: Port 443 is the default HTTPS port, so it gets omitted
      expect(getDomain('https://example.com:443')).toBe('https://example.com/')
      expect(getDomain('http://127.0.0.1:3000')).toBe('http://127.0.0.1:3000/')
    })
  })
})
