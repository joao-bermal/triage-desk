'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { createClient } from '@/lib/supabase/browser';

export function LoginForm({ demo }: { demo: { email: string; password: string } | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function signIn(email: string, password: string) {
    setPending(true);
    setError(null);
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    setPending(false);
    if (error) return setError(error.message);
    router.replace('/inbox');
    router.refresh();
  }

  return (
    <>
      {demo && (
        <div className="mt-6 rounded-xl border border-stone-200 bg-stone-50 p-4">
          <p className="text-sm text-stone-600">
            Try it as a support agent at Miau Atelier. The agent has already triaged the sample messages.
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => signIn(demo.email, demo.password)}
            className="mt-3 w-full rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? 'Signing in…' : 'Enter the demo'}
          </button>
        </div>
      )}
      <form action={(form) => signIn(String(form.get('email')), String(form.get('password')))} className="mt-6 flex flex-col gap-3">
        <label className="text-sm font-medium">
          Email
          <input name="email" type="email" required autoComplete="email" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900" />
        </label>
        <label className="text-sm font-medium">
          Password
          <input name="password" type="password" required autoComplete="current-password" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900" />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          disabled={pending}
          className={`mt-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60 ${demo ? 'border border-stone-300 text-stone-700 hover:bg-stone-50' : 'bg-stone-900 text-white'}`}
        >
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </>
  );
}
