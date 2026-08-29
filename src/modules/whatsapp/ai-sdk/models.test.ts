import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import {
  hasAiGatewayAuth,
  resolveIntakeRoute,
  resolveReplyRoute,
  routeToProviderLabel,
} from './models'

describe('ai-sdk models resolver', () => {
  const env = { ...process.env }

  beforeEach(() => {
    process.env = { ...env }
    delete process.env.AI_GATEWAY_API_KEY
    delete process.env.VERCEL_OIDC_TOKEN
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY
    delete process.env.OPENAI_API_KEY
    delete process.env.ANTHROPIC_API_KEY
  })

  afterEach(() => {
    process.env = env
  })

  it('detects gateway auth', () => {
    expect(hasAiGatewayAuth()).toBe(false)
    process.env.AI_GATEWAY_API_KEY = 'gw'
    expect(hasAiGatewayAuth()).toBe(true)
  })

  it('prefers gateway for intake when available', () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'g'
    process.env.AI_GATEWAY_API_KEY = 'gw'
    expect(resolveIntakeRoute()).toBe('gateway')
    expect(routeToProviderLabel('gateway')).toBe('gateway')
  })

  it('falls back gemini → openai for intake', () => {
    expect(resolveIntakeRoute()).toBe('none')
    process.env.OPENAI_API_KEY = 'o'
    expect(resolveIntakeRoute()).toBe('openai')
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'g'
    expect(resolveIntakeRoute()).toBe('google')
    expect(routeToProviderLabel('google')).toBe('gemini')
  })

  it('prefers anthropic for reply rewrite without gateway', () => {
    process.env.ANTHROPIC_API_KEY = 'a'
    process.env.OPENAI_API_KEY = 'o'
    expect(resolveReplyRoute()).toBe('anthropic')
  })
})
