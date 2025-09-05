#!/usr/bin/env node
require('dotenv').config();
const fetch = global.fetch || require('node-fetch');

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

async function main() {
  console.log('Scanning academic_results for missing submitted_by...');
  const rows = await fetchJson("academic_results?select=id,teacher_id,submitted_by,teacher_name&submitted_by=is.null&limit=1000");
  if (!Array.isArray(rows)) { console.error('Unexpected response:', rows); process.exit(3); }
  let total = rows.length; let patched = 0; let skipped = 0; const failed = [];
  for (const r of rows) {
    try {
      if (!r.teacher_id) { skipped++; continue; }
      // fetch teacher name
      const trows = await fetchJson(`teachers?select=id,name&id=eq.${r.teacher_id}&limit=1`);
      const t = Array.isArray(trows) && trows.length > 0 ? trows[0] : null;
      if (!t || !t.name) { skipped++; continue; }
      const body = JSON.stringify({ submitted_by: t.name, teacher_name: t.name });
      const updateRes = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/academic_results?id=eq.${r.id}`, { method: 'PATCH', headers: { ...headers, Prefer: 'return=representation' }, body });
      if (!updateRes.ok) {
        const ttext = await updateRes.text(); failed.push({ id: r.id, status: updateRes.status, body: ttext });
      } else patched++;
    } catch (err) { failed.push({ id: r?.id, error: String(err) }); }
  }
  console.log({ total, patched, skipped, failedCount: failed.length, failed });
}

main().catch(e => { console.error(e); process.exit(1); });
