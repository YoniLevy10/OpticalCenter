import { z } from 'zod'
import { TICKET_CATEGORIES, TICKET_PRIORITIES } from '@/modules/tickets/constants'

const categorySchema = z.enum([
  'hvac',
  'electrical',
  'plumbing',
  'security',
  'it',
  'cleaning',
  'other',
  'electrical_hazard',
])

const prioritySchema = z.enum(['critical', 'high', 'medium', 'low'])

/** Structured AI intake output — validated, never free-text parsed. */
export const intakeAgentOutputSchema = z.object({
  category: categorySchema,
  summary: z.string().min(1).max(400),
  asset: z.string().max(120).nullable(),
  priority_suggestion: prioritySchema,
  needs_clarification: z.boolean(),
  clarification_question: z.string().max(200).nullable(),
  possible_duplicate_hint: z.string().max(200).nullable(),
})

export type IntakeAgentOutput = z.infer<typeof intakeAgentOutputSchema>

export const INTAKE_AGENT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'category',
    'summary',
    'asset',
    'priority_suggestion',
    'needs_clarification',
    'clarification_question',
    'possible_duplicate_hint',
  ],
  properties: {
    category: {
      type: 'string',
      enum: [
        'hvac',
        'electrical',
        'plumbing',
        'security',
        'it',
        'cleaning',
        'other',
        'electrical_hazard',
      ],
    },
    summary: { type: 'string' },
    asset: { type: ['string', 'null'] },
    priority_suggestion: {
      type: 'string',
      enum: [...TICKET_PRIORITIES],
    },
    needs_clarification: { type: 'boolean' },
    clarification_question: { type: ['string', 'null'] },
    possible_duplicate_hint: { type: ['string', 'null'] },
  },
} as const

export function parseIntakeAgentOutput(raw: unknown): IntakeAgentOutput {
  return intakeAgentOutputSchema.parse(raw)
}

export function safeParseIntakeAgentOutput(raw: unknown) {
  return intakeAgentOutputSchema.safeParse(raw)
}

/** Categories persisted on tickets (after normalize). */
export const PERSISTED_CATEGORIES = TICKET_CATEGORIES
