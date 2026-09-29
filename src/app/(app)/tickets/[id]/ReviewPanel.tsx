'use client';

import { useState, useTransition } from 'react';

import { DEMO_MODE } from '@/lib/demo';
import type { TicketStatus } from '@/lib/tickets';

import { approveReply, retriage, saveDraft, setStatus } from '../../actions';

export function ReviewPanel({ ticketId, initialReply, editable, status }: { ticketId: string; initialReply: string; editable: boolean; status: TicketStatus }) {
  const [reply, setReply] = useState(initialReply);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ error?: string; ok?: boolean }>, done: string) =>
    start(async () => {
      const res = await fn();
      setMessage(res.error ?? done);
    });

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Reply</h2>
        <span className="text-xs text-stone-500">{editable ? 'Drafted by the agent. Edit before approving.' : 'Locked after approval.'}</span>
      </div>
      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        disabled={!editable || pending}
        rows={12}
        className="mt-3 w-full rounded-lg border border-stone-300 p-3 text-sm leading-relaxed outline-none focus:border-stone-900 disabled:bg-stone-50"
      />
      {editable && (
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <button
            disabled={pending || !reply.trim()}
            onClick={() => run(() => approveReply(ticketId, reply), DEMO_MODE ? 'Approved. Sending is off in the public demo.' : 'Approved. n8n is sending the reply.')}
            className="rounded-lg bg-stone-900 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            Approve and send
          </button>
          <button disabled={pending} onClick={() => run(() => saveDraft(ticketId, reply), 'Draft saved.')} className="rounded-lg border border-stone-300 px-4 py-2 hover:bg-stone-50">
            Save draft
          </button>
          {status !== 'needs_human' && (
            <button disabled={pending} onClick={() => run(() => setStatus(ticketId, 'needs_human'), 'Flagged for a human.')} className="rounded-lg border border-stone-300 px-4 py-2 hover:bg-stone-50">
              Flag for a human
            </button>
          )}
          <button disabled={pending} onClick={() => run(() => setStatus(ticketId, 'closed'), 'Closed without a reply.')} className="rounded-lg border border-stone-300 px-4 py-2 hover:bg-stone-50">
            Close
          </button>
          <button disabled={pending} onClick={() => run(() => retriage(ticketId), 'Triage re-run.')} className="ml-auto rounded-lg px-3 py-2 text-stone-500 hover:text-stone-900">
            Re-run AI triage
          </button>
        </div>
      )}
      {/* The page refreshes live, so once n8n marks the ticket sent the approval note is stale. */}
      {status === 'sent' ? (
        <p className="mt-3 text-sm text-stone-600">Sent to the customer.</p>
      ) : (
        message && <p className="mt-3 text-sm text-stone-600">{message}</p>
      )}
    </div>
  );
}
