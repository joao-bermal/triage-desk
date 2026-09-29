import type { Metadata } from 'next';

import { createClient } from '@/lib/supabase/server';
import { categoryLabel, PRICE_PER_MTOK, type Ticket } from '@/lib/tickets';

export const metadata: Metadata = { title: 'Metrics' };

export default async function MetricsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('tickets')
    .select('status, category, confidence, triage_ms, triage_input_tokens, triage_output_tokens, triaged_at, approved_at, received_at, draft_reply, final_reply')
    .limit(2000);
  const rows = (data ?? []) as Pick<Ticket, 'status' | 'category' | 'confidence' | 'triage_ms' | 'triage_input_tokens' | 'triage_output_tokens' | 'triaged_at' | 'approved_at' | 'received_at' | 'draft_reply' | 'final_reply'>[];

  const triaged = rows.filter((r) => r.triaged_at);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const needsHuman = triaged.filter((r) => r.status === 'needs_human').length;
  const approved = rows.filter((r) => r.approved_at);
  const unedited = approved.filter((r) => r.draft_reply && r.final_reply?.trim() === r.draft_reply.trim()).length;
  const tokensIn = triaged.reduce((a, r) => a + (r.triage_input_tokens ?? 0), 0);
  const tokensOut = triaged.reduce((a, r) => a + (r.triage_output_tokens ?? 0), 0);
  const cost = (tokensIn * PRICE_PER_MTOK.input + tokensOut * PRICE_PER_MTOK.output) / 1_000_000;

  const byCategory = new Map<string, number>();
  for (const r of triaged) byCategory.set(r.category ?? 'other', (byCategory.get(r.category ?? 'other') ?? 0) + 1);
  const categories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...categories.map(([, n]) => n));

  const stats = [
    { label: 'Tickets', value: rows.length.toString() },
    { label: 'Triaged by the agent', value: triaged.length.toString() },
    { label: 'Average triage time', value: `${(avg(triaged.map((r) => r.triage_ms ?? 0)) / 1000).toFixed(1)} s` },
    { label: 'Average confidence', value: `${Math.round(avg(triaged.map((r) => r.confidence ?? 0)) * 100)}%` },
    { label: 'Handed to a human', value: triaged.length ? `${Math.round((needsHuman / triaged.length) * 100)}%` : 'n/a' },
    { label: 'Approved without edits', value: approved.length ? `${Math.round((unedited / approved.length) * 100)}%` : 'n/a' },
    { label: 'AI cost so far', value: `$${cost.toFixed(2)}` },
    { label: 'Cost per ticket', value: triaged.length ? `$${(cost / triaged.length).toFixed(3)}` : 'n/a' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Metrics</h1>
      <p className="mt-1 text-sm text-stone-500">For the brands you can see. Cost uses Claude Opus 5.5 list prices.</p>
      <dl className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-stone-200 bg-white p-4">
            <dt className="text-xs text-stone-500">{s.label}</dt>
            <dd className="mt-1 text-2xl font-semibold tracking-tight">{s.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-8 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-semibold">Tickets by category</h2>
        <ul className="mt-4 flex flex-col gap-2">
          {categories.map(([c, n]) => (
            <li key={c} className="grid grid-cols-[10rem_1fr_2rem] items-center gap-3 text-sm">
              <span className="text-stone-600">{categoryLabel(c)}</span>
              <span className="h-2 rounded-full bg-stone-900" style={{ width: `${(n / max) * 100}%` }} />
              <span className="text-right tabular-nums">{n}</span>
            </li>
          ))}
          {categories.length === 0 && <li className="text-sm text-stone-500">No triaged tickets yet.</li>}
        </ul>
      </div>
    </div>
  );
}
