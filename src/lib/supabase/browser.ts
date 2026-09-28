import { createBrowserClient } from '@supabase/ssr';

/** Browser client: sign-in form and the realtime subscription that refreshes the inbox. */
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
