import type { Metadata } from 'next';
import Link from 'next/link';

import { LiveRefresh } from '@/components/LiveRefresh';
import { createClient } from '@/lib/supabase/server';
import { categoryLabel, PRIORITY_STYLE, STATUS_LABEL, STATUS_STYLE, TICKET_COLUMNS, timeAgo, type Ticket, type TicketStatus } from '@/lib/tickets';

export const metadata: Metadata = { title: 'Inbox' };

const FILTERS: { key: string; label: string; statuses: TicketStatus[] }[] = [
  { key: 'open', label: 'Open', statuses: ['new', 'triaged', 'needs_human'] },
  { key: 'needs_human', label: 'Needs a human', statuses: ['needs_human'] },
  { key: 'triaged', label: 'Ready to review', statuses: ['triaged'] },
  { key: 'done', label: 'Done', statuses: ['approved', 'sent', 'closed'] },
];

export default async function InboxPage({ searchParams }: PageProps<'/inbox'>) {
  const params = await searchParams;
  const active = FILTERS.find((f) => f.key === params.view) ?? FILTERS[0];
  const supabase = await createClient();

  const [{ data: tickets }, { data: brands }] = await Promise.all([
    supabase.from('tickets').select(TICKET_COLUMNS).in('status', active.statuses).order('received_at', { ascending: false }).limit(100),
    supabase.from('brands').select('id, name'),
  ]);
  const brandName = new Map((brands ?? []).map((b) => [b.id, b.name]));
  const rows = (tickets ?? []) as Ticket[];

  return (
    <div>
      <LiveRefresh />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
          <p className="mt-1 text-sm text-stone-500">Every message is triaged by the agent before it reaches you. Updates live.</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-stone-200 bg-white p-1 text-sm">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={`/inbox?view=${f.key}`}
              className={`rounded-md px-3 py-1.5 ${f.key === active.key ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'}`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-stone-200 bg-white">
        {rows.length === 0 && <p className="p-8 text-center text-sm text-stone-500">Nothing here.</p>}
        <ul className="divide-y divide-stone-100">
          {rows.map((t) => (
            <li key={t.id}>
              <Link href={`/tickets/${t.id}`} className="grid gap-2 px-5 py-4 hover:bg-stone-50 md:grid-cols-[1fr_auto] md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`rounded-full px-2 py-0.5 font-medium ${STATUS_STYLE[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                    <span className="text-stone-500">{brandName.get(t.brand_id)}</span>
                    <span className="text-stone-500">{categoryLabel(t.category)}</span>
                    {t.priority && <span className={`capitalize ${PRIORITY_STYLE[t.priority]}`}>{t.priority}</span>}
                  </div>
                  <p className="mt-1.5 truncate font-medium">{t.subject || '(no subject)'}</p>
                  <p className="mt-0.5 truncate text-sm text-stone-500">{t.summary ?? t.body}</p>
                </div>
                <div className="text-right text-xs text-stone-500">
                  <p>{t.customer_name ?? t.customer_email}</p>
                  <p className="mt-0.5">{timeAgo(t.received_at)}</p>
                  {t.confidence !== null && <p className="mt-0.5">AI confidence {Math.round(t.confidence * 100)}%</p>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
