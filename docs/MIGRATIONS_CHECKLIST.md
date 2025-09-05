Migrations checklist

- supabase/migrations/20250828_create_assistant_logs.sql  -> apply to add assistant_logs table
- supabase/migrations/20250828_allow_service_role_fee_payments.sql -> apply to add defensive INSERT policy for fee_payments

Notes:
- Run migrations with your preferred migration runner or apply via Supabase SQL editor.
- Ensure SUPABASE_SERVICE_ROLE_KEY is set in production before applying any migration relying on the service role.
- After migrations, verify via admin UI and by attempting a test Paystack verification.
