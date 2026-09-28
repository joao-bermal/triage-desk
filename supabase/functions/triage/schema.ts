// JSON schemas for structured outputs and a small runtime check for the triage record.

export const CATEGORIES = [
  'order_status', 'shipping', 'returns_refunds', 'damaged_or_wrong_item',
  'product_question', 'sizing_fit', 'pre_sales', 'billing', 'feedback', 'spam', 'other',
] as const;
export const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export const SENTIMENTS = ['positive', 'neutral', 'negative', 'angry'] as const;

const nullableString = { anyOf: [{ type: 'string' }, { type: 'null' }] };

export const TRIAGE_SCHEMA = {
  type: 'object',
  properties: {
    category: { type: 'string', enum: [...CATEGORIES] },
    priority: { type: 'string', enum: [...PRIORITIES] },
    sentiment: { type: 'string', enum: [...SENTIMENTS] },
    language: { type: 'string', description: 'ISO 639-1 code of the customer message, e.g. en' },
    summary: { type: 'string' },
    order_number: nullableString,
    needs_human: { type: 'boolean' },
    needs_human_reason: nullableString,
    confidence: { type: 'number' },
    draft_reply: nullableString,
    internal_note: { type: 'string' },
  },
  required: [
    'category', 'priority', 'sentiment', 'language', 'summary', 'order_number',
    'needs_human', 'needs_human_reason', 'confidence', 'draft_reply', 'internal_note',
  ],
  additionalProperties: false,
} as const;

export const POLICY_ANSWER_SCHEMA = {
  type: 'object',
  properties: {
    answer: { type: 'string' },
    covered: { type: 'boolean' },
    policy_slugs: { type: 'array', items: { type: 'string' } },
  },
  required: ['answer', 'covered', 'policy_slugs'],
  additionalProperties: false,
} as const;

export const PRODUCT_ANSWER_SCHEMA = {
  type: 'object',
  properties: {
    answer: { type: 'string' },
    confident: { type: 'boolean' },
    product_handles: { type: 'array', items: { type: 'string' } },
  },
  required: ['answer', 'confident', 'product_handles'],
  additionalProperties: false,
} as const;

export type TriageRecord = {
  category: (typeof CATEGORIES)[number];
  priority: (typeof PRIORITIES)[number];
  sentiment: (typeof SENTIMENTS)[number];
  language: string;
  summary: string;
  order_number: string | null;
  needs_human: boolean;
  needs_human_reason: string | null;
  confidence: number;
  draft_reply: string | null;
  internal_note: string;
};

/** Structured outputs guarantee the shape; this guards the values we store (enums, 0 to 1 range). */
export function checkTriageRecord(value: unknown): TriageRecord {
  const r = value as TriageRecord;
  if (!r || typeof r !== 'object') throw new Error('triage record is not an object');
  if (!CATEGORIES.includes(r.category)) throw new Error(`unknown category ${r.category}`);
  if (!PRIORITIES.includes(r.priority)) throw new Error(`unknown priority ${r.priority}`);
  if (!SENTIMENTS.includes(r.sentiment)) throw new Error(`unknown sentiment ${r.sentiment}`);
  if (typeof r.confidence !== 'number' || Number.isNaN(r.confidence)) throw new Error('confidence is not a number');
  r.confidence = Math.min(1, Math.max(0, r.confidence));
  return r;
}
