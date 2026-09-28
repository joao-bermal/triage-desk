import type { Metadata } from 'next';

import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Triage Desk</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Sign in to the support inbox</h1>
        <p className="mt-2 text-sm text-stone-500">AI drafts every reply. You approve what goes out.</p>
        <LoginForm />
      </div>
    </main>
  );
}
