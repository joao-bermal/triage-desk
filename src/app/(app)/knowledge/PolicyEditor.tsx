'use client';

import { useState, useTransition } from 'react';

import { updatePolicy } from './actions';

type Policy = { id: string; title: string; body: string; updated_at: string };

export function PolicyEditor({ policy, canEdit }: { policy: Policy; canEdit: boolean }) {
  const [body, setBody] = useState(policy.body);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{policy.title}</h3>
        <span className="text-xs text-stone-400">Updated {new Date(policy.updated_at).toLocaleDateString()}</span>
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        disabled={!canEdit || pending}
        rows={6}
        className="mt-3 w-full rounded-lg border border-stone-300 p-3 text-sm leading-relaxed outline-none focus:border-stone-900 disabled:bg-stone-50 disabled:text-stone-600"
      />
      {canEdit ? (
        <div className="mt-2 flex items-center gap-3">
          <button
            disabled={pending || body === policy.body}
            onClick={() =>
              start(async () => {
                const res = await updatePolicy(policy.id, body);
                setMessage(res.error ?? 'Saved. New tickets use this text.');
              })
            }
            className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            Save
          </button>
          {message && <span className="text-sm text-stone-600">{message}</span>}
        </div>
      ) : (
        <p className="mt-2 text-xs text-stone-400">Read only: only brand admins can change policies.</p>
      )}
    </div>
  );
}
