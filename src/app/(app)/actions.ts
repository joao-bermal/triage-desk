'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

/**
 * Staff actions on a ticket. They run as the signed-in user, so RLS decides whether the
 * ticket is theirs, column grants limit what they can change, and the database trigger
 * validates the status move and stamps who approved it.
 */
export async function approveReply(ticketId: string, finalReply: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('tickets').update({ final_reply: finalReply, status: 'approved' }).eq('id', ticketId);
  if (error) return { error: error.message };
  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath('/inbox');
  return { ok: true };
}

export async function saveDraft(ticketId: string, finalReply: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('tickets').update({ final_reply: finalReply }).eq('id', ticketId);
  if (error) return { error: error.message };
  revalidatePath(`/tickets/${ticketId}`);
  return { ok: true };
}

export async function setStatus(ticketId: string, status: 'needs_human' | 'closed' | 'triaged') {
  const supabase = await createClient();
  const { error } = await supabase.from('tickets').update({ status }).eq('id', ticketId);
  if (error) return { error: error.message };
  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath('/inbox');
  return { ok: true };
}

/** Re-run the AI triage. The user must be able to read the ticket (RLS) before we call the agent. */
export async function retriage(ticketId: string) {
  const supabase = await createClient();
  const { data: ticket } = await supabase.from('tickets').select('id').eq('id', ticketId).maybeSingle();
  if (!ticket) return { error: 'Ticket not found' };
  const res = await fetch(process.env.TRIAGE_FUNCTION_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-triage-secret': process.env.TRIAGE_WEBHOOK_SECRET! },
    body: JSON.stringify({ ticket_id: ticketId, force: true }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    if (res.status === 429 && body?.limit) return { error: `Re-runs are limited to ${body.limit} a day here. Try again tomorrow.` };
    return { error: `Triage failed (${res.status})` };
  }
  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath('/inbox');
  return { ok: true };
}
