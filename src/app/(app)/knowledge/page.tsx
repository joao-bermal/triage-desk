import type { Metadata } from 'next';

import { requireUser } from '@/lib/supabase/server';

import { PolicyEditor } from './PolicyEditor';

export const metadata: Metadata = { title: 'Knowledge' };

export default async function KnowledgePage() {
  const { supabase, user } = await requireUser();
  const [{ data: policies }, { data: brands }, { data: roles }] = await Promise.all([
    supabase.from('policies').select('id, brand_id, slug, title, body, updated_at').order('slug'),
    supabase.from('brands').select('id, name').order('name'),
    supabase.from('brand_members').select('brand_id, role').eq('user_id', user!.id),
  ]);
  const isAdmin = new Set((roles ?? []).filter((r) => r.role === 'admin').map((r) => r.brand_id));

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Knowledge</h1>
      <p className="mt-1 text-sm text-stone-500">
        The policy specialist answers only from these texts. Admins can edit them; agents can read them. Row Level Security enforces both.
      </p>
      {(brands ?? []).map((b) => (
        <section key={b.id} className="mt-8">
          <h2 className="text-lg font-semibold">{b.name}</h2>
          <div className="mt-3 flex flex-col gap-4">
            {(policies ?? [])
              .filter((p) => p.brand_id === b.id)
              .map((p) => (
                <PolicyEditor key={p.id} policy={p} canEdit={isAdmin.has(b.id)} />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
