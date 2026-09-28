'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';

/** RLS lets only brand admins update policies; for anyone else the update matches no rows. */
export async function updatePolicy(id: string, body: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('policies').update({ body, updated_by: user?.id }).eq('id', id).select('id');
  if (error) return { error: error.message };
  if (!data?.length) return { error: 'Only brand admins can edit policies.' };
  revalidatePath('/knowledge');
  return { ok: true };
}
