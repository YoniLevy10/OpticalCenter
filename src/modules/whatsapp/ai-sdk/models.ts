import type { LanguageModel } from 'ai'

/**
 * Vercel AI Gateway ONLY.
 * Auth: AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN (from `vercel env pull`).
 * No direct Anthropic / Google / OpenAI SDKs or API keys.
 */

export type AiRoute = 'gateway' | 'none'

export function hasAiGatewayAuth(): boolean {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY?.trim() ||
      process.env.VERCEL_OIDC_TOKEN?.trim(),
  )
}

export function resolveIntakeRoute(): AiRoute {
  return hasAiGatewayAuth() ? 'gateway' : 'none'
}

export function resolveReplyRoute(): AiRoute {
  return hasAiGatewayAuth() ? 'gateway' : 'none'
}

export function routeToProviderLabel(route: AiRoute): 'gateway' | 'none' {
  return route
}

function gatewayModel(
  envOverride: string | undefined,
  fallback: string,
): string {
  const raw = envOverride?.trim()
  if (raw?.includes('/') && !raw.startsWith('openai/')) return raw
  return fallback
}

/** Intake via Vercel AI Gateway (Haiku — available on Gateway after top-up). */
export async function resolveIntakeModel(): Promise<{
  model: LanguageModel
  route: AiRoute
  modelId: string
} | null> {
  if (!hasAiGatewayAuth()) return null
  const modelId = gatewayModel(
    process.env.WHATSAPP_AI_INTAKE_MODEL,
    'anthropic/claude-haiku-4.5',
  )
  return { model: modelId, route: 'gateway', modelId }
}

/** Reply rewrite via Vercel AI Gateway (default Claude Haiku slug). */
export async function resolveReplyModel(): Promise<{
  model: LanguageModel
  route: AiRoute
  modelId: string
} | null> {
  if (!hasAiGatewayAuth()) return null
  const modelId = gatewayModel(
    process.env.WHATSAPP_AI_MODEL,
    'anthropic/claude-haiku-4.5',
  )
  return { model: modelId, route: 'gateway', modelId }
}
