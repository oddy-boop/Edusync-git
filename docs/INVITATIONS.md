How to finalize invitations (server action)

This repository includes a server action `acceptInvitationAction` located at `src/lib/actions/invitations.actions.ts`.

When a user accepts an invitation by setting their password, call this server action to finalize the invitation and assign the requested role.

Example client-side flow (simplified):

1. User follows invite link, sets password, then signs in.
2. After sign-in, call a POST server action from the client to finalize the invite.

Example using fetch to call a server action route (Next.js App Router):

// From a client component after sign-in:
await fetch('/api/accept-invitation', { method: 'POST' });

Implement a small API route or server action that calls `acceptInvitationAction` with the current request's FormData.

Notes:
- `createClient()` used by the server action uses the SUPABASE_SERVICE_ROLE_KEY, so it must be kept secret.
- The server action verifies the current session via `supabase.auth.getUser()` before assigning roles.
- If you prefer fully-automated DB-side behavior, use the trigger in `Auth_session.sql` (requires creating a SECURITY DEFINER function with appropriate owner privileges).
