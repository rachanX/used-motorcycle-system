'use server';

import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(6)
});

export interface LoginState {
  error?: string;
}

export async function loginAction(
  locale: string,
  redirectTo: string,
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password')
  });

  if (!parsed.success) {
    return { error: 'invalid_input' };
  }

  // Look up the email from the username — Supabase Auth is email-based
  // internally. Use adminClient to bypass RLS on the users table.
  const { data: userRow } = await adminClient()
    .from('users')
    .select('email')
    .eq('username', parsed.data.username.toLowerCase())
    .single();

  if (!userRow?.email) {
    return { error: 'invalid_credentials' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: userRow.email,
    password: parsed.data.password
  });

  if (error || !data.user) {
    // Best-effort audit of the failed attempt (RPC runs even when unauthenticated).
    await (supabase.rpc as any)('log_auth_event', {
      p_action: 'failed_login',
      p_email: userRow.email
    });
    return { error: 'invalid_credentials' };
  }

  // Confirm the staff/developer profile is active before letting them in.
  const { data: profile } = await supabase
    .from('users')
    .select('is_active')
    .eq('id', data.user.id)
    .single();

  if (!profile?.is_active) {
    await supabase.auth.signOut();
    return { error: 'account_disabled' };
  }

  await (supabase.rpc as any)('log_auth_event', { p_action: 'login' });

  redirect(redirectTo && redirectTo !== '/' ? redirectTo : `/${locale}/dashboard`);
}

export async function logoutAction(locale: string) {
  const supabase = await createClient();
  await (supabase.rpc as any)('log_auth_event', { p_action: 'logout' });
  await supabase.auth.signOut();
  redirect(`/${locale}/login`);
}
