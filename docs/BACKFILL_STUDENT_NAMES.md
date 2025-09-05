Backfill student names from auth users

This one-time admin route helps populate `students.name` from the `auth.users` metadata when student records only contain `student_id_display`.

How to run (local/dev):

1. Add a secret to your environment (local .env):

   BACKFILL_SECRET=some-long-random-string

2. Start your Next dev server and call the route with the header `x-backfill-secret` set to the same secret.

   Example using curl (PowerShell):

   curl -X POST "http://localhost:3000/api/admin/backfill-student-names" -H "x-backfill-secret: some-long-random-string"

3. The route will return a JSON summary with counts of updated/skipped rows and any errors.

Security:
- This route uses the Supabase service-role key. Keep the `BACKFILL_SECRET` secret and remove the route after running it.
- Consider running this from a temporary admin script or using a serverless job instead of keeping it permanently in production.
