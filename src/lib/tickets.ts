export type TicketStatus = 'new' | 'triaged' | 'needs_human' | 'approved' | 'sent' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export type Ticket = {
  id: string;
  brand_id: string;
  customer_email: string;
  customer_name: string | null;
  subject: string;
  body: string;
  received_at: string;
  status: TicketStatus;
  category: string | null;
  priority: TicketPriority | null;
  sentiment: string | null;
  language: string | null;
  summary: string | null;
  draft_reply: string | null;
  final_reply: string | null;
  confidence: number | null;
  needs_human_reason: string | null;
  order_number: string | null;
  triage_model: string | null;
  triage_ms: number | null;
  triage_input_tokens: number | null;
  triage_output_tokens: number | null;
  triaged_at: string | null;
  approved_at: string | null;
  sent_at: string | null;
};

export const STATUS_LABEL: Record<TicketStatus, string> = {
  new: 'New',
  triaged: 'Ready to review',
  needs_human: 'Needs a human',
  approved: 'Approved',
  sent: 'Sent',
  closed: 'Closed',
};

export const STATUS_STYLE: Record<TicketStatus, string> = {
  new: 'bg-zinc-100 text-zinc-700',
  triaged: 'bg-emerald-50 text-emerald-700',
  needs_human: 'bg-amber-50 text-amber-800',
  approved: 'bg-sky-50 text-sky-700',
  sent: 'bg-indigo-50 text-indigo-700',
  closed: 'bg-zinc-100 text-zinc-500',
};

export const PRIORITY_STYLE: Record<TicketPriority, string> = {
  low: 'text-zinc-400',
  normal: 'text-zinc-600',
  high: 'text-orange-600',
  urgent: 'text-red-600 font-semibold',
};

export const categoryLabel = (c: string | null) => (c ? c.replaceAll('_', ' ') : 'not triaged');

export const TICKET_COLUMNS =
  'id, brand_id, customer_email, customer_name, subject, body, received_at, status, category, priority, sentiment, language, summary, draft_reply, final_reply, confidence, needs_human_reason, order_number, triage_model, triage_ms, triage_input_tokens, triage_output_tokens, triaged_at, approved_at, sent_at';

/** Opus 5.5 list prices (USD per million tokens), for the cost estimate on the metrics page. */
export const PRICE_PER_MTOK = { input: 4, output: 20 };

export function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}
