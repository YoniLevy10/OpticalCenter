import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import {
  hasAiGatewayAuth,
  resolveIntakeRoute,
  resolveReplyRoute,
  routeToProviderLabel,
} from './models'

describe('ai-sdk models resolver (Vercel Gateway only)', () => {
  const env = { ...process.env }

  beforeEach(() => {
    process.env = { ...env }
    delete process.env.AI_GATEWAY_API_KEY
    delete process.env.VERCEL_OIDC_TOKEN
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.OPENAI_API_KEY
  })

  afterEach(() => {
    process.env = env
  })

  it('requires Gateway auth', () => {
    expect(hasAiGatewayAuth()).toBe(false)
    expect(resolveIntakeRoute()).toBe('none')
    expect(resolveReplyRoute()).toBe('none')
    process.env.AI_GATEWAY_API_KEY = 'gw'
    expect(hasAiGatewayAuth()).toBe(true)
    expect(resolveIntakeRoute()).toBe('gateway')
    expect(resolveReplyRoute()).toBe('gateway')
    expect(routeToProviderLabel('gateway')).toBe('gateway')
  })

  it('ignores provider API keys (Anthropic / Google / OpenAI)', () => {
    process.env.ANTHROPIC_API_KEY = 'a'
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'g'
    process.env.OPENAI_API_KEY = 'o'
    expect(resolveIntakeRoute()).toBe('none')
    expect(resolveReplyRoute()).toBe('none')
  })

  it('accepts VERCEL_OIDC_TOKEN', () => {
    process.env.VERCEL_OIDC_TOKEN = 'oidc'
    expect(resolveReplyRoute()).toBe('gateway')
  })
})
