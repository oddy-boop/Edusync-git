#!/usr/bin/env node
/**
 * Simple admin CLI for debugging and backfilling student names using the
 * Supabase service-role key. Do NOT commit or expose your service role key.
 *
 * Usage:
 *   node ./scripts/admin-tool.js list-results
 *   node ./scripts/admin-tool.js backfill-students
 *
 * Ensure the env vars are set (or put them in .env): SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

require('dotenv').config();
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_REST_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
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

async function listResults() {
  console.log('Fetching recent academic_results...');
  const rows = await fetchJson("academic_results?select=*&order=created_at.desc&limit=200");
  console.log(JSON.stringify({ count: Array.isArray(rows) ? rows.length : 0, rows: rows }, null, 2));
}

async function backfillStudents() {
  console.log('Fetching students to backfill...');
  const students = await fetchJson('students?select=id,auth_user_id,student_id_display,name&limit=1000');
  if (!Array.isArray(students)) { console.error('Unexpected students response:', students); return; }

  let updated = 0; let skipped = 0; const errors = [];
  for (const s of students) {
    try {
      if (!s || !s.auth_user_id) { skipped++; continue; }
      if (s.name && String(s.name).trim() !== '' && String(s.name).trim() !== s.student_id_display) { skipped++; continue; }

      // fetch auth.users row
      const users = await fetchJson(`auth.users?select=user_metadata&id=eq.${s.auth_user_id}`);
      const user = Array.isArray(users) && users.length > 0 ? users[0] : null;
      const metadata = user?.user_metadata || {};
      const fullName = metadata?.full_name || metadata?.fullName || metadata?.name || null;
      if (!fullName || String(fullName).trim() === '' || String(fullName).trim() === s.student_id_display) { skipped++; continue; }

      // update students table
      const body = JSON.stringify({ name: String(fullName).trim() });
      const updateRes = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/students?id=eq.${s.id}`, { method: 'PATCH', headers: { ...headers, Prefer: 'return=representation' }, body });
      if (!updateRes.ok) {
        const t = await updateRes.text(); errors.push({ studentId: s.id, status: updateRes.status, body: t });
      } else {
        updated++;
      }
    } catch (err) {
      errors.push({ studentId: s?.id, error: String(err) });
    }
  }
  console.log({ updated, skipped, errors });
}

async function syncAcademicNames() {
  console.log('Syncing academic_results.student_name from students table...');
  // fetch academic results with missing student_name
  const results = await fetchJson("academic_results?select=id,student_id_display,student_name&student_name=is.null&limit=1000");
  if (!Array.isArray(results)) { console.error('Unexpected response:', results); return; }
  let updated = 0; const errors = [];
  for (const r of results) {
    try {
      if (!r || !r.student_id_display) { continue; }
      const students = await fetchJson(`students?select=name,student_id_display&id=eq.${r.student_id_display}`);
      // fallback: query by student_id_display equal
      let student = null;
      if (Array.isArray(students) && students.length > 0) student = students[0];
      if (!student) {
        // try different filter
        const s2 = await fetchJson(`students?select=name,student_id_display&student_id_display=eq.${r.student_id_display}`);
        if (Array.isArray(s2) && s2.length > 0) student = s2[0];
      }
      if (!student || !student.name) { continue; }
      const body = JSON.stringify({ student_name: student.name });
      const updateRes = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/academic_results?id=eq.${r.id}`, { method: 'PATCH', headers: { ...headers, Prefer: 'return=representation' }, body });
      if (!updateRes.ok) {
        const t = await updateRes.text(); errors.push({ id: r.id, status: updateRes.status, body: t });
      } else updated++;
    } catch (err) { errors.push({ id: r?.id, error: String(err) }); }
  }
  console.log({ updated, errors });
}

async function main() {
  const cmd = process.argv[2] || 'list-results';
  if (cmd === 'list-results') await listResults();
  else if (cmd === 'backfill-students') await backfillStudents();
  else if (cmd === 'sync-academic-names') await syncAcademicNames();
  else console.error('Unknown command. Use list-results, backfill-students or sync-academic-names');
}

main().catch(e => { console.error(e); process.exit(1); });
