'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { createClient } from '@/lib/supabase/browser';

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(form: FormData) {
    setPending(true);
    setError(null);
    const { error } = await createClient().auth.signInWithPassword({
      email: String(form.get('email')),
      password: String(form.get('password')),
    });
    setPending(false);
    if (error) return setError(error.message);
    router.replace('/inbox');
    router.refresh();
  }

  return (
    <form action={onSubmit} className="mt-6 flex flex-col gap-3">
      <label className="text-sm font-medium">
        Email
        <input name="email" type="email" required autoComplete="email" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900" />
      </label>
      <label className="text-sm font-medium">
        Password
        <input name="password" type="password" required autoComplete="current-password" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900" />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={pending} className="mt-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
