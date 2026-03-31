import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Badge from '@/components/Badge'

describe('Badge', () => {
  it('renders the label text', () => {
    render(<Badge label="active" />)
    expect(screen.getByText('active')).toBeInTheDocument()
  })

  it('applies correct color class for "emerald"', () => {
    render(<Badge label="online" color="emerald" />)
    const badge = screen.getByText('online')
    expect(badge.className).toContain('bg-emerald-500/10')
    expect(badge.className).toContain('text-emerald-400')
  })

  it('applies neutral color class by default', () => {
    render(<Badge label="default" />)
    const badge = screen.getByText('default')
    expect(badge.className).toContain('bg-neutral-500/10')
    expect(badge.className).toContain('text-neutral-400')
  })

  it('renders the dot element when dot prop is true', () => {
    const { container } = render(<Badge label="running" color="emerald" dot />)
    // The dot is a <span> sibling of the label text inside the badge
    const spans = container.querySelectorAll('span')
    // Outer badge span + inner dot span = 2
    expect(spans.length).toBe(2)
    const dotSpan = spans[1]
    expect(dotSpan.className).toContain('rounded-full')
    expect(dotSpan.className).toContain('w-1.5')
  })

  it('does not render the dot when dot prop is false', () => {
    const { container } = render(<Badge label="stopped" dot={false} />)
    const spans = container.querySelectorAll('span')
    // Only the outer badge span
    expect(spans.length).toBe(1)
  })

  it('does not render the dot when dot prop is undefined', () => {
    const { container } = render(<Badge label="stopped" />)
    const spans = container.querySelectorAll('span')
    expect(spans.length).toBe(1)
  })
})
