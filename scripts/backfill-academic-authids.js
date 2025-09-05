#!/usr/bin/env node
require('dotenv').config();
const fetch = global.fetch || require('node-fetch');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_REST_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const DRY_RUN = (process.env.DRY_RUN || 'true').toLowerCase() !== 'false';
const PAGE_LIMIT = parseInt(process.env.PAGE_LIMIT || '500', 10);

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment. Put them in .env or export them.');
  process.exit(2);
}

const headers = {
  'Content-Type': 'application/json',
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
};

async function fetchJson(path, opts = {}) {
  const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${path}`;
  const res = await fetch(url, { headers, ...opts });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

async function patchRow(table, id, payload) {
  if (DRY_RUN) return { ok: true, dryRun: true };
  const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}?id=eq.${id}`;
  const res = await fetch(url, { method: 'PATCH', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify(payload) });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { ok: res.ok, status: res.status, body };
}

async function main() {
  console.log('Backfill (dry-run=%s) — will scan academic_results for missing auth_user_id, student_name, submitted_by', DRY_RUN);

  // Fetch rows in batches where either auth_user_id IS NULL OR student_name IS NULL OR submitted_by IS NULL
  // Use REST filter: (auth_user_id=is.null,student_name=is.null,submitted_by=is.null) but some DBs may not have these columns; we'll fetch a broad set and check client-side.

  let offset = 0;
  let totalScanned = 0;
  let totalPatched = 0;
  let totalSkipped = 0;
  const failures = [];

  while (true) {
    // Limit fields to commonly expected ones but include wildcard if needed
    const rows = await fetchJson(`academic_results?select=id,student_id_display,student_name,teacher_id,submitted_by,auth_user_id,teacher_name&limit=${PAGE_LIMIT}&offset=${offset}`);
    if (!Array.isArray(rows)) {
      console.error('Unexpected response fetching academic_results:', rows);
      break;
    }
    if (rows.length === 0) break;

    for (const r of rows) {
      totalScanned++;
      try {
        const needsAuth = !('auth_user_id' in r) || r.auth_user_id === null || r.auth_user_id === '';
        const needsStudentName = !('student_name' in r) || r.student_name === null || String(r.student_name).trim() === '' || String(r.student_name).trim() === r.student_id_display;
        const needsSubmittedBy = !('submitted_by' in r) || r.submitted_by === null || String(r.submitted_by).trim() === '';

        if (!needsAuth && !needsStudentName && !needsSubmittedBy) {
          totalSkipped++; continue;
        }

        const patchPayload = {};

        // Resolve student auth_user_id and display/full name from students table
        if (needsAuth || needsStudentName) {
          const sid = r.student_id_display;
          if (sid) {
            const students = await fetchJson(`students?select=auth_user_id,full_name,name,student_id_display&student_id_display=eq.${encodeURIComponent(sid)}&limit=1`);
            const student = Array.isArray(students) && students.length > 0 ? students[0] : null;
            if (student) {
              if (needsAuth && ('auth_user_id' in student) && student.auth_user_id) patchPayload.auth_user_id = student.auth_user_id;
              const candidateName = student.full_name || student.name || null;
              if (needsStudentName && candidateName && String(candidateName).trim() !== '' && String(candidateName).trim() !== sid) patchPayload.student_name = String(candidateName).trim();
            } else {
              // no student row — skip updating student_name/auth mapping
            }
          }
        }

        // Resolve teacher name -> submitted_by
        if (needsSubmittedBy && r.teacher_id) {
          const trows = await fetchJson(`teachers?select=id,name,full_name&limit=1&id=eq.${r.teacher_id}`);
          const t = Array.isArray(trows) && trows.length > 0 ? trows[0] : null;
          if (t && (t.name || t.full_name)) patchPayload.submitted_by = t.full_name || t.name;
        }

        if (Object.keys(patchPayload).length === 0) { totalSkipped++; continue; }

        const res = await patchRow('academic_results', r.id, patchPayload);
        if (res.ok) {
          totalPatched++;
          if (DRY_RUN) console.log('[DRY] Would patch', r.id, patchPayload);
          else console.log('Patched', r.id, patchPayload);
        } else {
          failures.push({ id: r.id, status: res.status, body: res.body });
        }

      } catch (err) {
        failures.push({ id: r?.id, error: String(err) });
      }
    }

    if (rows.length < PAGE_LIMIT) break;
    offset += PAGE_LIMIT;
  }

  console.log({ totalScanned, totalPatched, totalSkipped, failuresCount: failures.length, failures: failures.slice(0,20) });
  if (DRY_RUN) console.log('Dry run complete. To apply patches set DRY_RUN=false and provide SUPABASE_SERVICE_ROLE_KEY in your environment.');
}

main().catch(e => { console.error(e); process.exit(1); });
