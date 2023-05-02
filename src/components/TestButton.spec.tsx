import * as React from 'react'
import { render, screen } from '@testing-library/react'
import { TestButton } from './TestButton'

test('TestButton contains the correct text', () => {
  render(<TestButton />)
  const text = screen.getByText('Test Button')
  expect(text).toBeInTheDocument()
})

test('', () => {
  expect(1).toBe(1)
})
