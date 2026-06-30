'use server';

import { createClient, getCurrentAppUser } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Service-role client — used ONLY for the auth.admin invite call, which
// the anon/authenticated client cannot perform. Never exposed to the browser.
function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function assertDeveloper() {
  const me = await getCurrentAppUser();
  if (!me || me.role !== 'developer') {
    throw new Error('Forbidden: developer role required');
  }
  return me;
}

const inviteSchema = z.object({
  username: z.string().min(2).regex(/^[a-z0-9_]+$/, 'Username must be lowercase letters, numbers or underscores'),
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(1),
  role: z.enum(['developer', 'staff']),
  branch_id: z.string().uuid().nullable()
});

export interface CreateUserState { error?: string; }

export async function inviteUserAction(
  locale: string,
  _prev: CreateUserState,
  formData: FormData
): Promise<CreateUserState> {
  await assertDeveloper();

  const result = inviteSchema.safeParse({
    username: (formData.get('username') as string ?? '').toLowerCase(),
    email: formData.get('email'),
    password: formData.get('password'),
    full_name: formData.get('full_name'),
    role: formData.get('role'),
    branch_id: formData.get('branch_id') || null
  });

  if (!result.success) return { error: result.error.issues[0]?.message ?? 'Invalid input' };
  const parsed = result.data;

  const admin = adminClient();

  // Create the user directly with admin API — no email invite needed.
  // Pass username in user_metadata so the handle_new_user() trigger can
  // set it on the public.users row immediately (username is NOT NULL).
  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.email,
    password: parsed.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.full_name, username: parsed.username }
  });
  if (error) return { error: error.message || error.toString() || 'Failed to create user' };

  // handle_new_user() trigger creates the public.users row with the username
  // from metadata; update it to set the correct role and branch.
  const { error: updateErr } = await admin
    .from('users')
    .update({ username: parsed.username, role: parsed.role, branch_id: parsed.branch_id, full_name: parsed.full_name })
    .eq('id', data.user!.id);
  if (updateErr) return { error: updateErr.message || 'Failed to update user profile' };

  revalidatePath(`/${locale}/users`);
  return {};
}

const updateSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(2).regex(/^[a-z0-9_]+$/),
  full_name: z.string().min(1),
  phone: z.string().nullable(),
  role: z.enum(['developer', 'staff']),
  branch_id: z.string().uuid().nullable(),
  is_active: z.boolean()
});

export async function updateUserAction(locale: string, formData: FormData) {
  const me = await assertDeveloper();

  const parsed = updateSchema.parse({
    id: formData.get('id'),
    username: (formData.get('username') as string ?? '').toLowerCase(),
    full_name: formData.get('full_name'),
    phone: formData.get('phone') || null,
    role: formData.get('role'),
    branch_id: formData.get('branch_id') || null,
    is_active: formData.get('is_active') === 'on'
  });

  if (parsed.id === me.id && parsed.role !== 'developer') {
    throw new Error('cannot_demote_self');
  }

  // Defense in depth: a developer editing their own profile can NEVER
  // change their own role or deactivate themselves, no matter what the
  // submitted form data says (the UI also prevents this, but a previous
  // bug where disabled fields were silently dropped from FormData
  // proved this needs to be enforced server-side too).
  const isSelfEdit = parsed.id === me.id;
  const finalRole = isSelfEdit ? 'developer' : parsed.role;
  const finalIsActive = isSelfEdit ? true : parsed.is_active;

  const supabase = await createClient();
  const { error } = await supabase
    .from('users')
    .update({
      username: parsed.username,
      full_name: parsed.full_name,
      phone: parsed.phone,
      role: finalRole,
      branch_id: finalRole === 'developer' ? null : parsed.branch_id,
      is_active: finalIsActive
    })
    .eq('id', parsed.id);
  if (error) throw error;

  revalidatePath(`/${locale}/users`);
}
