Student-fees diagnostics

This repo includes a server-only diagnostic endpoint at /api/diagnostics/student-fees.

How to use:
- While signed in as the student in your browser, open this URL in the same browser session:
  /api/diagnostics/student-fees

- Copy the JSON response and paste it back in the issue or chat. It includes:
  - resolved user (id, email)
  - student row
  - school settings
  - school_fee_items
  - fee_payments
  - student_arrears
  - any errors encountered during server-side reads (service role bypasses RLS)

Notes:
- This route uses the server service role client to read data; it will bypass RLS and therefore helps to determine whether client-side RLS or missing env keys are the cause of the browser fetch failures.
- Remove or secure this route in production if you don't want a broad diagnostic endpoint available in a signed-in session.
