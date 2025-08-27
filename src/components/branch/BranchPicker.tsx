"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type School = {
  id: number | string;
  name: string;
  logo_url?: string | null;
  domain?: string | null;
};

export function BranchGate({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<School | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('selectedSchool');
      if (raw) {
        setSelected(JSON.parse(raw));
      }
    } catch (e) {
      console.error('Failed to read selectedSchool from localStorage', e);
    }
    // small delay to avoid flash
    setTimeout(() => setReady(true), 50);
  }, []);

  function handleSelect(school: School) {
    setSelected(school);
    try {
      localStorage.setItem('selectedSchool', JSON.stringify(school));
    } catch (e) {
      console.error('Failed to persist selectedSchool', e);
    }
  }

  // If a school is already selected, render children immediately
  if (selected) return <>{children}</>;

  // Until ready, render nothing (or a minimal loader)
  if (!ready) return null;

  // show picker
  return <BranchPicker onSelect={handleSelect} />;
}

export default function BranchPicker({ onSelect }: { onSelect: (s: School) => void }) {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from('schools').select('id, name, domain, logo_url');
        if (error) throw error;
        if (!mounted) return;
        setSchools((data as any[]) || []);
      } catch (e: any) {
        console.error('Failed to load schools for BranchPicker', e);
        setError(e?.message || 'Failed to load branches');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-2xl mx-4 bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 border-b flex items-center">
          <img src="/logo.svg" alt="EduSync" className="h-10 w-10 mr-3" />
          <div>
            <h3 className="text-lg font-semibold">Select your School Branch</h3>
            <p className="text-sm text-muted-foreground">Choose the branch you want to use for this session.</p>
          </div>
        </div>
        <div className="p-6">
          {loading && <div className="py-6">Loading branches…</div>}
          {error && <div className="text-red-600">{error}</div>}
          {!loading && !error && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {schools.length === 0 && (
                <div className="p-4 border rounded">No branches configured yet.</div>
              )}
              {schools.map((s) => (
                <button
                  key={String(s.id)}
                  onClick={() => onSelect(s)}
                  className="flex items-center gap-3 p-4 border rounded hover:bg-gray-50 text-left"
                >
                  <img src={s.logo_url || '/logo.svg'} alt={s.name} className="h-12 w-12 rounded object-cover" />
                  <div>
                    <div className="font-medium">{s.name}</div>
                    {s.domain && <div className="text-sm text-muted-foreground">{s.domain}</div>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 border-t text-right">
          <small className="text-xs text-muted-foreground">You can change branch later in your profile/settings.</small>
        </div>
      </div>
    </div>
  );
}
