'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { createClient } from '@/lib/supabase/browser';

/**
 * Subscribes to ticket changes over Supabase Realtime and re-renders the page when n8n or
 * the triage agent writes something. Realtime honours RLS, so users only hear about their
 * own brands' tickets.
 */
export function LiveRefresh() {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('tickets-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => router.refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);
  return null;
}
