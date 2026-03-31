import { describe, it, expect } from 'vitest'
import { CreateAgentSchema, SlugSchema, CreateMemorySchema, CreateScheduleSchema } from '@/lib/schemas'

describe('CreateAgentSchema', () => {
  const validAgent = {
    name: 'My Agent',
    slug: 'my-agent',
    personality: 'Helpful and concise',
    model: 'claude-sonnet-4-6',
  }

  it('accepts a valid agent', () => {
    const result = CreateAgentSchema.safeParse(validAgent)
    expect(result.success).toBe(true)
  })

  it('fails when name is missing', () => {
    const { name: _, ...noName } = validAgent
    const result = CreateAgentSchema.safeParse(noName)
    expect(result.success).toBe(false)
  })

  it('fails when name is empty', () => {
    const result = CreateAgentSchema.safeParse({ ...validAgent, name: '' })
    expect(result.success).toBe(false)
  })

  it('fails when slug is missing', () => {
    const { slug: _, ...noSlug } = validAgent
    const result = CreateAgentSchema.safeParse(noSlug)
    expect(result.success).toBe(false)
  })
})

describe('SlugSchema', () => {
  it('fails for slugs with spaces', () => {
    const result = SlugSchema.safeParse('my agent')
    expect(result.success).toBe(false)
  })

  it('fails for slugs with uppercase letters', () => {
    const result = SlugSchema.safeParse('MyAgent')
    expect(result.success).toBe(false)
  })

  it('accepts a valid lowercase slug', () => {
    const result = SlugSchema.safeParse('my-agent-123')
    expect(result.success).toBe(true)
  })

  it('fails for empty slug', () => {
    const result = SlugSchema.safeParse('')
    expect(result.success).toBe(false)
  })

  it('fails for slugs with special characters', () => {
    const result = SlugSchema.safeParse('my_agent!')
    expect(result.success).toBe(false)
  })
})

describe('CreateMemorySchema', () => {
  const validMemory = {
    fact: 'The sky is blue',
    category: 'general',
    importance: 5,
  }

  it('accepts a valid memory', () => {
    const result = CreateMemorySchema.safeParse(validMemory)
    expect(result.success).toBe(true)
  })

  it('fails when importance is 0 (below minimum of 1)', () => {
    const result = CreateMemorySchema.safeParse({ ...validMemory, importance: 0 })
    expect(result.success).toBe(false)
  })

  it('fails when importance is 11 (above maximum of 10)', () => {
    const result = CreateMemorySchema.safeParse({ ...validMemory, importance: 11 })
    expect(result.success).toBe(false)
  })

  it('accepts importance at boundary values 1 and 10', () => {
    expect(CreateMemorySchema.safeParse({ ...validMemory, importance: 1 }).success).toBe(true)
    expect(CreateMemorySchema.safeParse({ ...validMemory, importance: 10 }).success).toBe(true)
  })

  it('fails when fact is missing', () => {
    const { fact: _, ...noFact } = validMemory
    const result = CreateMemorySchema.safeParse(noFact)
    expect(result.success).toBe(false)
  })
})

describe('CreateScheduleSchema', () => {
  const validSchedule = {
    agent_id: '123e4567-e89b-12d3-a456-426614174000',
    type: 'cron' as const,
    name: 'Daily digest',
    cron_expr: '0 9 * * *',
  }

  it('accepts a valid schedule', () => {
    const result = CreateScheduleSchema.safeParse(validSchedule)
    expect(result.success).toBe(true)
  })

  it('fails when cron_expr is missing', () => {
    const { cron_expr: _, ...noCron } = validSchedule
    const result = CreateScheduleSchema.safeParse(noCron)
    expect(result.success).toBe(false)
  })

  it('fails when cron_expr is empty', () => {
    const result = CreateScheduleSchema.safeParse({ ...validSchedule, cron_expr: '' })
    expect(result.success).toBe(false)
  })

  it('fails when agent_id is not a valid UUID', () => {
    const result = CreateScheduleSchema.safeParse({ ...validSchedule, agent_id: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })

  it('fails when type is invalid', () => {
    const result = CreateScheduleSchema.safeParse({ ...validSchedule, type: 'interval' })
    expect(result.success).toBe(false)
  })
})
