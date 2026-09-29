import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { LiveRefresh } from '@/components/LiveRefresh';
import { createClient } from '@/lib/supabase/server';
import { categoryLabel, PRIORITY_STYLE, STATUS_LABEL, STATUS_STYLE, TICKET_COLUMNS, timeAgo, type Ticket } from '@/lib/tickets';

import { ReviewPanel } from './ReviewPanel';

export const metadata: Metadata = { title: 'Ticket' };

type ToolCall = { name: string; ms: number; error?: string };

export default async function TicketPage({ params }: PageProps<'/tickets/[id]'>) {
  const { id } = await params;
  const supabase = await createClient();

  // RLS: a ticket from another brand simply does not exist for this user.
  const { data } = await supabase.from('tickets').select(TICKET_COLUMNS).eq('id', id).maybeSingle();
  if (!data) notFound();
  const t = data as Ticket;

  const [{ data: brand }, { data: order }, { data: events }] = await Promise.all([
    supabase.from('brands').select('name').eq('id', t.brand_id).single(),
    t.order_number
      ? supabase.from('orders').select('order_number, status, items, placed_at, shipped_at, delivered_at, tracking_url').eq('brand_id', t.brand_id).eq('order_number', t.order_number).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('ticket_events').select('actor, type, payload, created_at').eq('ticket_id', id).order('created_at', { ascending: false }),
  ]);
  const triageEvent = (events ?? []).find((e) => e.type === 'triaged');
  const tools = ((triageEvent?.payload as { tools?: ToolCall[] } | undefined)?.tools ?? []) as ToolCall[];
  const note = (triageEvent?.payload as { internal_note?: string } | undefined)?.internal_note;
  const editable = ['new', 'triaged', 'needs_human'].includes(t.status);

  return (
    <div>
      <LiveRefresh />
      <Link href="/inbox" className="text-sm text-stone-500 hover:text-stone-900">
        ← Inbox
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full px-2 py-0.5 font-medium ${STATUS_STYLE[t.status]}`}>{STATUS_LABEL[t.status]}</span>
        <span className="text-stone-500">{brand?.name}</span>
        <span className="text-stone-500">{categoryLabel(t.category)}</span>
        {t.priority && <span className={`capitalize ${PRIORITY_STYLE[t.priority]}`}>{t.priority} priority</span>}
      </div>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t.subject || '(no subject)'}</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="flex flex-col gap-6">
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <p className="text-sm text-stone-500">
              {t.customer_name} &lt;{t.customer_email}&gt; · {timeAgo(t.received_at)}
            </p>
            <p className="mt-3 whitespace-pre-wrap leading-relaxed">{t.body}</p>
          </div>

          <ReviewPanel ticketId={t.id} initialReply={t.final_reply ?? t.draft_reply ?? ''} editable={editable} status={t.status} />
        </section>

        <aside className="flex flex-col gap-6">
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <h2 className="text-sm font-semibold">AI triage</h2>
            {t.triaged_at ? (
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-stone-500">Summary</dt>
                <dd>{t.summary}</dd>
                <dt className="text-stone-500">Confidence</dt>
                <dd>{Math.round((t.confidence ?? 0) * 100)}%</dd>
                <dt className="text-stone-500">Sentiment</dt>
                <dd className="capitalize">{t.sentiment}</dd>
                {t.needs_human_reason && (
                  <>
                    <dt className="text-amber-700">Needs a human</dt>
                    <dd className="text-amber-800">{t.needs_human_reason}</dd>
                  </>
                )}
                {note && (
                  <>
                    <dt className="text-stone-500">Agent note</dt>
                    <dd className="text-stone-700">{note}</dd>
                  </>
                )}
                <dt className="text-stone-500">Tools used</dt>
                <dd>
                  {tools.length ? tools.map((c) => `${c.name.replaceAll('_', ' ')}${c.error ? ' (failed)' : ''}`).join(', ') : 'none'}
                </dd>
                <dt className="text-stone-500">Run</dt>
                <dd className="text-stone-600">
                  {t.triage_model} · {((t.triage_ms ?? 0) / 1000).toFixed(1)} s · {(t.triage_input_tokens ?? 0).toLocaleString()} in / {(t.triage_output_tokens ?? 0).toLocaleString()} out tokens
                </dd>
              </dl>
            ) : (
              <p className="mt-3 text-sm text-stone-500">Waiting for the agent.</p>
            )}
          </div>

          {order && (
            <div className="rounded-xl border border-stone-200 bg-white p-5 text-sm">
              <h2 className="font-semibold">Order {order.order_number}</h2>
              <p className="mt-2 capitalize">{String(order.status).replaceAll('_', ' ')}</p>
              <ul className="mt-2 text-stone-600">
                {(order.items as { title: string; qty: number }[]).map((i) => (
                  <li key={i.title}>
                    {i.qty} × {i.title}
                  </li>
                ))}
              </ul>
              {order.tracking_url && (
                <a href={order.tracking_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sky-700 underline">
                  Tracking
                </a>
              )}
            </div>
          )}

          <div className="rounded-xl border border-stone-200 bg-white p-5 text-sm">
            <h2 className="font-semibold">History</h2>
            <ol className="mt-3 flex flex-col gap-2 text-stone-600">
              {(events ?? []).map((e, i) => (
                <li key={i} className="flex justify-between gap-4">
                  <span className="capitalize">{e.type.replaceAll('_', ' ')}</span>
                  <span className="text-stone-400">
                    {e.actor.length > 20 ? 'staff' : e.actor} · {timeAgo(e.created_at)}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
