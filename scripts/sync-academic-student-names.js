#!/usr/bin/env node
require('dotenv').config();
const fetch = global.fetch || require('node-fetch');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_REST_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

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

async function main() {
  console.log('Scanning academic_results for student_name to fix...');
  // Find rows where student_name is null or equals student_id_display
  const rows = await fetchJson("academic_results?select=id,student_id_display,student_name&limit=1000");
  if (!Array.isArray(rows)) { console.error('Unexpected response fetching academic_results:', rows); process.exit(3); }

  let total = 0, patched = 0, skipped = 0;
  const failed = [];

  for (const r of rows) {
    total++;
    try {
      const sid = r.student_id_display;
      const sname = r.student_name;
      // Only attempt patch when student_name is null or equals the id (i.e., placeholder)
      if (sname && String(sname).trim() !== '' && String(sname).trim() !== sid) { skipped++; continue; }

      // Lookup student row by student_id_display
      const students = await fetchJson(`students?select=id,name,full_name,student_id_display&student_id_display=eq.${encodeURIComponent(sid)}&limit=1`);
      const student = Array.isArray(students) && students.length > 0 ? students[0] : null;
      if (!student) { failed.push({ id: r.id, student_id_display: sid, reason: 'no student row' }); continue; }
      const candidate = student.full_name || student.name || null;
      if (!candidate || String(candidate).trim() === '' || String(candidate).trim() === sid) {
        failed.push({ id: r.id, student_id_display: sid, reason: 'student has no name' });
        continue;
      }

      // Patch academic_results
      const body = JSON.stringify({ student_name: String(candidate).trim() });
      const updateRes = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/academic_results?id=eq.${r.id}`, { method: 'PATCH', headers: { ...headers, Prefer: 'return=representation' }, body });
      if (!updateRes.ok) {
        const t = await updateRes.text(); failed.push({ id: r.id, student_id_display: sid, status: updateRes.status, body: t });
      } else patched++;
    } catch (err) {
      failed.push({ id: r?.id, student_id_display: r?.student_id_display, error: String(err) });
    }
  }

  console.log({ total, patched, skipped, failedCount: failed.length, failed: failed.slice(0,20) });
}

main().catch(e => { console.error(e); process.exit(1); });
