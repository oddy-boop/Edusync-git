'use server';

import { z } from 'zod';
import { createAuthClient } from '@/lib/supabase/server';

const acceptInvitationSchema = z.object({
  invitationId: z.string().uuid().optional(),
  email: z.string().email().optional(),
});

type ActionResponse = {
  success: boolean;
  message: string;
};

// This server action finalizes an invitation: finds a pending invitation by id or email,
// attaches the current authenticated user's id, inserts the corresponding user_roles row
// and marks the invitation accepted. It uses the service_role key via createClient().
export async function acceptInvitationAction(formData: FormData): Promise<ActionResponse> {
  const supabase = createAuthClient();

  // Get the current authenticated user from the request cookies/session
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr) return { success: false, message: 'Could not verify user session.' };
  if (!user) return { success: false, message: 'Unauthorized: user not signed in.' };

  const rawInvitationId = formData.get('invitationId');
  const rawEmail = formData.get('email');

  const parsed = acceptInvitationSchema.safeParse({ invitationId: rawInvitationId, email: rawEmail });
  if (!parsed.success) {
    return { success: false, message: 'Invalid input.' };
  }

  try {
    // Find pending invitation by ID or by email
    let invitationQuery = supabase.from('user_invitations').select('*').eq('status', 'pending').limit(1);
    if (parsed.data.invitationId) invitationQuery = invitationQuery.eq('id', parsed.data.invitationId);
    else if (parsed.data.email) invitationQuery = invitationQuery.eq('email', parsed.data.email.toLowerCase());
    else invitationQuery = invitationQuery.eq('email', user.email?.toLowerCase());

    const { data: invitations, error: invErr } = await invitationQuery;
    if (invErr) throw invErr;
    const inv = invitations?.[0];
    if (!inv) return { success: false, message: 'No pending invitation found.' };

    // Attach user_id and insert user_roles using the service role
    const { error: roleErr } = await supabase.from('user_roles').insert({
      user_id: user.id,
      role: inv.role,
      school_id: inv.school_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (roleErr) throw roleErr;

    // Mark invitation accepted
    const { error: updateErr } = await supabase.from('user_invitations').update({ status: 'accepted', user_id: user.id, updated_at: new Date().toISOString() }).eq('id', inv.id);
    if (updateErr) throw updateErr;

    return { success: true, message: 'Invitation accepted and role assigned.' };
  } catch (err: any) {
    console.error('acceptInvitationAction error', err);
    return { success: false, message: err.message || 'An unexpected error occurred.' };
  }
}
