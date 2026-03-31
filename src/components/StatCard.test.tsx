import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import StatCard from '@/components/StatCard'

describe('StatCard', () => {
  it('renders the label', () => {
    render(<StatCard label="Total Jobs" value={42} />)
    expect(screen.getByText('Total Jobs')).toBeInTheDocument()
  })

  it('renders the value', () => {
    render(<StatCard label="Total Jobs" value={42} />)
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('renders string value', () => {
    render(<StatCard label="Cost" value="$1.23" />)
    expect(screen.getByText('$1.23')).toBeInTheDocument()
  })

  it('renders detail when provided', () => {
    render(<StatCard label="Jobs" value={10} detail="last 24h" />)
    expect(screen.getByText('last 24h')).toBeInTheDocument()
  })

  it('does not render detail when not provided', () => {
    const { container } = render(<StatCard label="Jobs" value={10} />)
    // Only the label <p> and value <p> should exist — no third <p>
    const paragraphs = container.querySelectorAll('p')
    expect(paragraphs.length).toBe(2)
  })

  it('applies the emerald color class by default', () => {
    render(<StatCard label="Score" value="99" />)
    const valueParagraph = screen.getByText('99')
    expect(valueParagraph.className).toContain('text-emerald-400')
  })

  it('applies the correct color class for "red"', () => {
    render(<StatCard label="Errors" value={5} color="red" />)
    const valueParagraph = screen.getByText('5')
    expect(valueParagraph.className).toContain('text-red-400')
  })

  it('applies the correct color class for "blue"', () => {
    render(<StatCard label="Runs" value={100} color="blue" />)
    const valueParagraph = screen.getByText('100')
    expect(valueParagraph.className).toContain('text-blue-400')
  })
})
