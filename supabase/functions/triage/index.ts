// POST /functions/v1/triage  { "ticket_id": "<uuid>", "force": false }
//
// Called by the n8n inbound workflow right after a ticket is stored. Authenticated with a
// shared secret header (x-triage-secret) instead of a user JWT, because the caller is a
// server. Reads and writes with the service role; the dashboard only ever sees the result
// through RLS.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Anthropic from 'npm:@anthropic-ai/sdk@0.128.0';
import { createClient } from 'npm:@supabase/supabase-js@2.117.2';

import { MODEL, triageTicket } from './agent.ts';

const SECRET = Deno.env.get('TRIAGE_WEBHOOK_SECRET') ?? '';
// Optional cap on forced re-runs ("Re-run AI triage" in the dashboard) per rolling 24 hours.
// The public demo sets it so visitors cannot spend the API budget; unset means no cap.
const FORCED_DAILY_LIMIT = Number(Deno.env.get('FORCED_TRIAGE_DAILY_LIMIT') ?? 0);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/** Constant-time comparison so the secret cannot be guessed byte by byte. */
function safeEqual(a: string, b: string) {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  if (!SECRET || !safeEqual(req.headers.get('x-triage-secret') ?? '', SECRET)) {
    return json({ error: 'unauthorized' }, 401);
  }

  let ticketId: string;
  let force = false;
  try {
    const body = await req.json();
    ticketId = String(body.ticket_id ?? '');
    force = Boolean(body.force);
  } catch {
    return json({ error: 'invalid JSON body' }, 400);
  }
  if (!/^[0-9a-f-]{36}$/i.test(ticketId)) return json({ error: 'ticket_id must be a uuid' }, 400);

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  const { data: ticket, error: ticketError } = await db
    .from('tickets')
    .select('id, brand_id, status, customer_email, customer_name, subject, body, received_at')
    .eq('id', ticketId)
    .single();
  if (ticketError || !ticket) return json({ error: 'ticket not found' }, 404);
  if (ticket.status !== 'new' && !force) {
    return json({ skipped: true, reason: `ticket is already ${ticket.status}` });
  }
  if (force && FORCED_DAILY_LIMIT > 0) {
    const { count } = await db
      .from('ticket_events')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'triaged')
      .eq('payload->>forced', 'true')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    if ((count ?? 0) >= FORCED_DAILY_LIMIT) return json({ error: 'daily re-run limit reached', limit: FORCED_DAILY_LIMIT }, 429);
  }

  const [brandRes, policiesRes, productsRes] = await Promise.all([
    db.from('brands').select('id, name, voice, signature, support_email').eq('id', ticket.brand_id).single(),
    db.from('policies').select('slug, title, body').eq('brand_id', ticket.brand_id).order('slug'),
    db.from('products').select('handle, title, size_fit, details, price_usd').eq('brand_id', ticket.brand_id).order('handle'),
  ]);
  if (brandRes.error || !brandRes.data) return json({ error: 'brand not found' }, 500);

  const started = Date.now();
  try {
    const outcome = await triageTicket({
      client: new Anthropic(), // reads ANTHROPIC_API_KEY from the function secrets
      db,
      brand: brandRes.data,
      policies: policiesRes.data ?? [],
      products: productsRes.data ?? [],
      ticket,
    });
    const r = outcome.record;
    const status = r.category === 'spam' ? 'closed' : r.needs_human ? 'needs_human' : 'triaged';

    const { error: updateError } = await db
      .from('tickets')
      .update({
        status,
        category: r.category,
        priority: r.priority,
        sentiment: r.sentiment,
        language: r.language,
        summary: r.summary,
        draft_reply: r.draft_reply,
        final_reply: r.draft_reply,
        confidence: r.confidence,
        needs_human_reason: r.needs_human ? r.needs_human_reason : null,
        order_number: r.order_number,
        triage_model: MODEL,
        triage_ms: Date.now() - started,
        triage_input_tokens: outcome.usage.input,
        triage_output_tokens: outcome.usage.output,
        triaged_at: new Date().toISOString(),
      })
      .eq('id', ticket.id);
    if (updateError) throw new Error(`could not save triage: ${updateError.message}`);

    await db.from('ticket_events').insert({
      ticket_id: ticket.id,
      brand_id: ticket.brand_id,
      actor: 'triage-agent',
      type: 'triaged',
      payload: {
        status,
        category: r.category,
        confidence: r.confidence,
        internal_note: r.internal_note,
        tools: outcome.tools,
        usage: outcome.usage,
        refused: outcome.refused,
        forced: force,
      },
    });

    return json({ ticket_id: ticket.id, status, ...r, usage: outcome.usage, tools: outcome.tools.map((t) => t.name) });
  } catch (error) {
    const message = error instanceof Anthropic.APIError ? `Claude API ${error.status}: ${error.message}` : String(error);
    await db.from('ticket_events').insert({
      ticket_id: ticket.id,
      brand_id: ticket.brand_id,
      actor: 'triage-agent',
      type: 'triage_failed',
      payload: { message },
    });
    // 5xx so n8n retries; rate limits and overloads are transient.
    const status = error instanceof Anthropic.RateLimitError ? 429 : 502;
    return json({ error: message }, status);
  }
});
