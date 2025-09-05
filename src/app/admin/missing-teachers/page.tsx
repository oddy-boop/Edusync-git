"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

type MissingUser = { id: string; email: string; meta?: any };

export default function MissingTeachersPage() {
  const [loading, setLoading] = useState(false);
  const [missing, setMissing] = useState<MissingUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [provisioning, setProvisioning] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/missing-teachers');
      const body = await res.json();
      if (!body.success) throw new Error(body.message || 'Failed');
      setMissing(body.missing ?? body.data ?? []);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function provision(u: MissingUser) {
    setProvisioning((p) => ({ ...p, [u.id]: true }));
    try {
      const res = await fetch('/api/admin/provision-teacher', { method: 'POST', body: JSON.stringify({ auth_user_id: u.id, email: u.email, name: u.meta?.full_name ?? null }) });
      const body = await res.json();
      if (!body.success) throw new Error(body.message || 'Provision failed');
      // refresh list
      await load();
    } catch (e: any) {
      alert('Provision failed: ' + (e?.message || String(e)));
    } finally {
      setProvisioning((p) => ({ ...p, [u.id]: false }));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Missing Teacher Profiles</h2>
        <div>
          <Button onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</Button>
        </div>
      </div>
      {error && <div className="text-red-600">{error}</div>}
      <div>
        {missing.length === 0 && !loading && <div className="text-sm text-muted-foreground">No missing teacher profiles found.</div>}
        <div className="space-y-2">
          {missing.map((u) => (
            <div key={u.id} className="flex items-center justify-between p-2 border rounded">
              <div>
                <div className="font-medium">{u.email}</div>
                <div className="text-sm text-muted-foreground">{u.meta?.full_name ?? ''}</div>
              </div>
              <div>
                <Button onClick={() => provision(u)} disabled={!!provisioning[u.id]}>{provisioning[u.id] ? 'Provisioning...' : 'Provision'}</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
