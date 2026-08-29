import type { LanguageModel } from 'ai'

/**
 * Resolve language models via Vercel AI Gateway when available,
 * otherwise fall back to direct @ai-sdk/* providers with existing env keys.
 *
 * Gateway auth: AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN (from `vercel env pull`).
 * Server-side only — do not import from Client Components.
 */

export type AiRoute =
  | 'gateway'
  | 'google'
  | 'openai'
  | 'anthropic'
  | 'none'

export function hasAiGatewayAuth(): boolean {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY?.trim() ||
      process.env.VERCEL_OIDC_TOKEN?.trim(),
  )
}

export function resolveIntakeRoute(): AiRoute {
  if (hasAiGatewayAuth()) return 'gateway'
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()) return 'google'
  if (process.env.OPENAI_API_KEY?.trim()) return 'openai'
  return 'none'
}

export function resolveReplyRoute(): AiRoute {
  if (hasAiGatewayAuth()) return 'gateway'
  if (process.env.ANTHROPIC_API_KEY?.trim()) return 'anthropic'
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()) return 'google'
  if (process.env.OPENAI_API_KEY?.trim()) return 'openai'
  return 'none'
}

/** Provider label for logging / IntakeDecision.provider. */
export function routeToProviderLabel(
  route: AiRoute,
): 'gateway' | 'gemini' | 'openai' | 'anthropic' | 'none' {
  if (route === 'google') return 'gemini'
  return route
}

function gatewayOrOverride(
  envOverride: string | undefined,
  fallback: string,
): string {
  const raw = envOverride?.trim()
  if (raw?.includes('/')) return raw
  // Legacy bare model ids → map into gateway provider/model form when possible
  if (raw) {
    if (raw.startsWith('gemini') || raw.startsWith('google/')) {
      return raw.startsWith('google/') ? raw : `google/${raw}`
    }
    if (raw.startsWith('gpt') || raw.startsWith('o1') || raw.startsWith('o3')) {
      return `openai/${raw}`
    }
    if (raw.startsWith('claude') || raw.startsWith('anthropic/')) {
      return raw.startsWith('anthropic/') ? raw : `anthropic/${raw}`
    }
  }
  return fallback
}

/**
 * Intake defaults: Gemini Flash (free tier preference) → OpenAI.
 * On gateway, prefer google/gemini-2.0-flash unless overridden.
 */
export async function resolveIntakeModel(): Promise<{
  model: LanguageModel
  route: AiRoute
  modelId: string
} | null> {
  const route = resolveIntakeRoute()
  if (route === 'none') return null

  const override = process.env.WHATSAPP_AI_INTAKE_MODEL

  if (route === 'gateway') {
    // Pilot preference: Gemini Flash via gateway (override for OpenAI/etc.)
    const modelId = gatewayOrOverride(override, 'google/gemini-2.0-flash')
    return { model: modelId, route, modelId }
  }

  if (route === 'google') {
    const { google } = await import('@ai-sdk/google')
    const id =
      override?.trim() && !override.includes('/')
        ? override.trim()
        : override?.startsWith('google/')
          ? override.replace(/^google\//, '')
          : 'gemini-2.0-flash'
    return { model: google(id), route, modelId: `google/${id}` }
  }

  if (route === 'openai') {
    const { openai } = await import('@ai-sdk/openai')
    const id =
      override?.trim() && !override.includes('/')
        ? override.trim()
        : override?.startsWith('openai/')
          ? override.replace(/^openai\//, '')
          : 'gpt-4o-mini'
    return { model: openai(id), route, modelId: `openai/${id}` }
  }

  return null
}

/**
 * Reply rewrite defaults: Claude Haiku via gateway / Anthropic provider.
 */
export async function resolveReplyModel(): Promise<{
  model: LanguageModel
  route: AiRoute
  modelId: string
} | null> {
  const route = resolveReplyRoute()
  if (route === 'none') return null

  const override = process.env.WHATSAPP_AI_MODEL

  if (route === 'gateway') {
    const modelId = gatewayOrOverride(
      override,
      'anthropic/claude-haiku-4.5',
    )
    return { model: modelId, route, modelId }
  }

  if (route === 'anthropic') {
    const { anthropic } = await import('@ai-sdk/anthropic')
    const id =
      override?.trim() && !override.includes('/')
        ? override.trim()
        : override?.startsWith('anthropic/')
          ? override.replace(/^anthropic\//, '')
          : 'claude-haiku-4-5-20251001'
    return { model: anthropic(id), route, modelId: `anthropic/${id}` }
  }

  if (route === 'google') {
    const { google } = await import('@ai-sdk/google')
    return {
      model: google('gemini-2.0-flash'),
      route,
      modelId: 'google/gemini-2.0-flash',
    }
  }

  if (route === 'openai') {
    const { openai } = await import('@ai-sdk/openai')
    return {
      model: openai('gpt-4o-mini'),
      route,
      modelId: 'openai/gpt-4o-mini',
    }
  }

  return null
}
