import type { LanguageModel } from 'ai'

/**
 * Resolve language models via platforms we already use:
 * - Vercel AI Gateway (preferred on Vercel)
 * - Google Gemini (intake)
 * - Anthropic Claude (reply rewrite)
 *
 * No OpenAI. Gateway auth: AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN.
 */

export type AiRoute = 'gateway' | 'google' | 'anthropic' | 'none'

export function hasAiGatewayAuth(): boolean {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY?.trim() ||
      process.env.VERCEL_OIDC_TOKEN?.trim(),
  )
}

export function resolveIntakeRoute(): AiRoute {
  if (hasAiGatewayAuth()) return 'gateway'
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()) return 'google'
  if (process.env.ANTHROPIC_API_KEY?.trim()) return 'anthropic'
  return 'none'
}

export function resolveReplyRoute(): AiRoute {
  if (hasAiGatewayAuth()) return 'gateway'
  if (process.env.ANTHROPIC_API_KEY?.trim()) return 'anthropic'
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()) return 'google'
  return 'none'
}

/** Provider label for logging / IntakeDecision.provider. */
export function routeToProviderLabel(
  route: AiRoute,
): 'gateway' | 'gemini' | 'anthropic' | 'none' {
  if (route === 'google') return 'gemini'
  return route
}

function gatewayOrOverride(
  envOverride: string | undefined,
  fallback: string,
): string {
  const raw = envOverride?.trim()
  if (!raw) return fallback
  if (raw.includes('/')) {
    // Reject openai/* — stick to Vercel Gateway + Google + Anthropic
    if (raw.startsWith('openai/')) return fallback
    return raw
  }
  if (raw.startsWith('gemini')) return `google/${raw}`
  if (raw.startsWith('claude')) return `anthropic/${raw}`
  return fallback
}

/**
 * Intake defaults: Gemini Flash via gateway / Google key.
 * Anthropic is last-resort fallback when only ANTHROPIC_API_KEY is set.
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

  return null
}

/**
 * Reply rewrite defaults: Claude Haiku via gateway / Anthropic.
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
    const modelId = gatewayOrOverride(override, 'anthropic/claude-haiku-4.5')
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

  return null
}
