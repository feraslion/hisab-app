import { db } from '@/lib/db/local';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = url && key ? createClient(url, key) : null;

export const isOnline = () => typeof navigator !== 'undefined' && navigator.onLine;
export const canSync = () => !!supabase && isOnline();

const tables = ['customers', 'products', 'invoices', 'invoiceitems', 'inventorymovements'] as const;

export async function pushPending() {
  if (!canSync() || !supabase) return;
  for (const t of tables) {
    const pending = await (db as any)[t].where('syncstatus').equals('pending').toArray();
    if (!pending.length) continue;
    const payload = pending.map((r: any) => {
      const { syncstatus, ...rest } = r;
      return rest;
    });
    const { error } = await supabase.from(t).upsert(payload, { onConflict: 'id' });
    if (error) {
      console.error(t, error.message);
      continue;
    }
    await (db as any)[t].bulkUpdate(pending.map((r: any) => ({
      key: r.id,
      changes: { syncstatus: 'synced' }
    })));
  }
}

export async function fullSync() {
  await pushPending();
}
