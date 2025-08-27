Storage migration: use Supabase built-in Storage

Goal
----
Remove any custom `storage` schema/tables and switch your app to use Supabase's built-in Storage API and buckets.

Prerequisites
-------------
- You must run cleanup as the DB owner (Service Role Key). Use the Supabase SQL editor or the provided PowerShell helper.
- Take a DB backup/snapshot before running destructive commands.

Files in this repo
------------------
- `cleanup_storage.sql` — drops the entire `storage` schema (destructive). Run as owner.
- `storage.sql` — previously created custom storage schema (you can ignore/remove it now).
- `run_storage_sql.ps1` — helper script to run `storage.sql` (you won't need this if using built-in storage).

Steps to migrate
-----------------
1. Backup: take a snapshot of your DB.
2. Run cleanup (owner):
   - In Supabase SQL editor (owner connection) paste or run `cleanup_storage.sql`.
   - Or run the PowerShell helper with owner credentials (not provided by this repo).
3. Confirm: check that `storage` schema no longer exists:
   SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'storage';
4. Use built-in Storage:
   - Create buckets in Supabase UI (Storage > Buckets) or via supabase-js/server SDK.
   - Update your application to call `supabase.storage.from('<bucket>').upload(...)` for uploads.

Client example (browser)
------------------------
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const file = input.files[0];
const path = `logos/${Date.now()}_${file.name}`;
const { data, error } = await supabase.storage.from('school-logos').upload(path, file);

Server example (signed URL or admin ops)
---------------------------------------
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(SUPABASE_URL, process.env.SERVICE_ROLE_KEY);
const { data } = await supabase.storage.from('school-logos').createSignedUrl('logos/xyz.png', 60);

Notes
-----
- The Service Role Key is powerful: do not expose it to clients.
- After cleanup you may need to re-create buckets in the Supabase Storage UI if you removed them.

If you want, I can:
- Add a small script to update your app upload calls to use `supabase.storage`.
- Create a migration to copy any files from your custom storage into the built-in buckets (if you had data).
