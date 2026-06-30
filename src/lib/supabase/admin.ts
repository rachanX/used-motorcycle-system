import { createClient as createAdminSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

/**
 * Service-role client — bypasses RLS entirely. ONLY use this in
 * Server Actions / route handlers, AFTER you've already verified the
 * caller's permissions yourself using getCurrentAppUser() and the
 * regular cookie-based client. Never expose this client or the
 * service role key to the browser.
 *
 * Used for: admin user invites, and soft-delete mutations where the
 * app-level authorization check (role === 'developer') has already
 * run, so bypassing RLS for the actual write is safe and removes any
 * dependency on RLS policy/grant configuration being perfectly in
 * sync in every environment.
 */
export function adminClient() {
  return createAdminSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
