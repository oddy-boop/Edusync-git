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
  const targetStudentId = process.argv[2] || '25STD2630';
  const term = process.argv[3] || 'Term 1';
  const year = process.argv[4] || '2025-2026';

  console.log('Updating academic_results rows for', targetStudentId, '-> term:', term, 'year:', year);

  const results = await fetchJson(`academic_results?select=id,student_id_display,term,year,student_name&student_id_display=eq.${encodeURIComponent(targetStudentId)}&limit=100`);
  if (!Array.isArray(results)) { console.error('Unexpected response fetching academic_results:', results); process.exit(3); }
  if (results.length === 0) { console.log('No academic_results rows found for', targetStudentId); return; }

  let updated = 0; const errors = [];
  for (const r of results) {
    try {
      const needs = (!r.term || !r.year || !r.student_name);
      if (!needs) continue;
      // try find student.name
      let studentName = r.student_id_display;
      const students = await fetchJson(`students?select=name,student_id_display&student_id_display=eq.${encodeURIComponent(r.student_id_display)}&limit=1`);
      if (Array.isArray(students) && students.length > 0 && students[0].name) studentName = students[0].name;

      const body = JSON.stringify({ term, year, student_name: studentName });
      const updateRes = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/academic_results?id=eq.${r.id}`, { method: 'PATCH', headers: { ...headers, Prefer: 'return=representation' }, body });
      if (!updateRes.ok) {
        const t = await updateRes.text(); errors.push({ id: r.id, status: updateRes.status, body: t });
      } else {
        updated++;
      }
    } catch (err) { errors.push({ id: r?.id, error: String(err) }); }
  }
  console.log({ totalFound: results.length, updated, errors });
}

main().catch(e => { console.error(e); process.exit(1); });
