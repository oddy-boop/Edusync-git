"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function SessionDebugPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function fetchDebug() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/session-debug');
      const json = await res.json();
      setData(json);
    } catch (e) {
      setData({ error: String(e) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchDebug(); }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Session Debug</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3">This page helps diagnose why the admin layout reports "Not authenticated".</p>
        <div className="flex gap-2">
          <Button onClick={fetchDebug} disabled={loading}>{loading ? 'Checking...' : 'Re-check session'}</Button>
          <Button onClick={async () => {
            try {
              const r = await fetch('/api/admin/provision-self', { method: 'POST' });
              const j = await r.json();
              alert(j.message || JSON.stringify(j));
              // Do NOT reload automatically. Re-check debug info so the user can decide to refresh.
              fetchDebug();
            } catch (e) {
              alert('Provision failed: ' + String(e));
            }
          }}>Provision myself</Button>
        </div>
        <div className="mt-4 font-mono text-sm whitespace-pre-wrap">{data ? JSON.stringify(data, null, 2) : 'No data yet'}</div>
        <div className="mt-4">
          <Link href="/auth/admin/login"><Button variant="ghost">Go to Admin Login</Button></Link>
        </div>
      </CardContent>
    </Card>
  );
}
