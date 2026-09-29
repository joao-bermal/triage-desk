import Link from 'next/link';
import { redirect } from 'next/navigation';

import { DEMO_MODE, REPO_URL } from '@/lib/demo';
import { requireUser } from '@/lib/supabase/server';

import { signOut } from './actions';

const NAV = [
  { href: '/inbox', label: 'Inbox' },
  { href: '/metrics', label: 'Metrics' },
  { href: '/knowledge', label: 'Knowledge' },
];

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const { supabase, user } = await requireUser();
  if (!user) redirect('/login');

  // RLS returns only the brands this user belongs to.
  const { data: memberships } = await supabase.from('brand_members').select('role, brands(name)').eq('user_id', user.id);

  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-6 px-4">
          <div className="flex items-center gap-8">
            <Link href="/inbox" className="font-semibold tracking-tight">
              Triage Desk
            </Link>
            <nav className="flex gap-5 text-sm text-stone-600">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="hover:text-stone-900">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-stone-500 sm:inline">
              {(memberships ?? [])
                .map((m) => `${(m.brands as unknown as { name: string } | null)?.name ?? '?'} (${m.role})`)
                .join(' · ')}
            </span>
            <span className="text-stone-700">{user.email}</span>
            <form action={signOut}>
              <button className="rounded-md border border-stone-300 px-2.5 py-1 text-stone-600 hover:bg-stone-50">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      {DEMO_MODE && (
        <div className="border-b border-amber-200 bg-amber-50 text-sm text-amber-900">
          <p className="mx-auto max-w-6xl px-4 py-2">
            Public demo. Tickets reset every day at 06:00 UTC. Approved replies are not emailed here: the n8n workflows run in the{' '}
            <a href={REPO_URL} className="font-medium underline underline-offset-2">
              local setup
            </a>
            .
          </p>
        </div>
      )}
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
