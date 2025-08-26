import * as React from 'react'
import { screen } from '@testing-library/react'
import { StepGuidance } from '../../WizardSteps/StepGuidance'
import { renderWithTheme } from '../../__tests__/testUtils'

describe('StepGuidance', () => {
  const defaultProps = {
    title: 'Test Title',
    description: 'Test description for the step guidance.',
  }

  it('renders title and description', () => {
    renderWithTheme(<StepGuidance {...defaultProps} />)

    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(
      screen.getByText('Test description for the step guidance.'),
    ).toBeInTheDocument()
  })

  it('renders with default variant styles', () => {
    renderWithTheme(<StepGuidance {...defaultProps} />)

    const guidanceBox = screen.getByText('Test Title').closest('div')
    expect(guidanceBox).toHaveStyle({
      borderColor: 'grey.300',
      backgroundColor: 'grey.50',
    })
  })

  it('renders with info variant styles', () => {
    renderWithTheme(<StepGuidance {...defaultProps} variant="info" />)

    const guidanceBox = screen.getByText('Test Title').closest('div')
    expect(guidanceBox).toHaveStyle({
      borderColor: 'primary.main',
      backgroundColor: 'primary.light',
      color: 'primary.contrastText',
    })
  })

  it('renders with warning variant styles', () => {
    renderWithTheme(<StepGuidance {...defaultProps} variant="warning" />)

    const guidanceBox = screen.getByText('Test Title').closest('div')
    expect(guidanceBox).toHaveStyle({
      borderColor: 'warning.main',
      backgroundColor: 'warning.light',
      color: 'warning.contrastText',
    })
  })

  it('applies correct typography styles to title', () => {
    renderWithTheme(<StepGuidance {...defaultProps} />)

    const title = screen.getByText('Test Title')
    expect(title).toHaveStyle({
      fontWeight: 'medium',
      marginBottom: '0.5rem',
    })
  })

  it('applies correct typography styles to description', () => {
    renderWithTheme(<StepGuidance {...defaultProps} />)

    const description = screen.getByText(
      'Test description for the step guidance.',
    )
    expect(description).toHaveStyle({
      fontSize: '0.875rem',
      color: 'text.secondary',
    })
  })

  it('renders with proper spacing and border radius', () => {
    renderWithTheme(<StepGuidance {...defaultProps} />)

    const guidanceBox = screen.getByText('Test Title').closest('div')
    expect(guidanceBox).toHaveStyle({
      padding: '1.5rem',
      border: '1px solid',
      borderRadius: '0.25rem',
      marginBottom: '2rem',
    })
  })

  it('handles long descriptions', () => {
    const longDescription =
      'This is a very long description that should wrap properly and maintain readability. It contains multiple sentences to test how the component handles longer text content.'

    renderWithTheme(
      <StepGuidance
        title="Long Description Test"
        description={longDescription}
      />,
    )

    expect(screen.getByText(longDescription)).toBeInTheDocument()
  })

  it('handles special characters in title and description', () => {
    const specialTitle = 'Step 1: Select Attributes & Colors'
    const specialDescription =
      'Choose from available options (1-16) and configure settings.'

    renderWithTheme(
      <StepGuidance title={specialTitle} description={specialDescription} />,
    )

    expect(screen.getByText(specialTitle)).toBeInTheDocument()
    expect(screen.getByText(specialDescription)).toBeInTheDocument()
  })
})
