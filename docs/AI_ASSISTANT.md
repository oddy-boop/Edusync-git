ODDY AI Assistant - design

Overview
- ODDY is an admin-scoped assistant that can answer queries and call safe server-side tools.

Files added
- `src/app/api/admin/assistant/route.ts` - server route that proxies prompts to the assistant flow and logs interactions.
- `supabase/migrations/20250828_create_assistant_logs.sql` - SQL to add `assistant_logs` table.
- `src/app/api/admin/session-debug/route.ts` - small helper to inspect the resolved session/user for debugging.

Next steps
- Run the migration to add the table.
- Verify the `session-debug` endpoint returns a user when an admin is signed in (helps debug the 'Not authenticated' issue).
- Optionally add RBAC and rate-limits to the assistant route.
