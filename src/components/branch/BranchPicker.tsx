"use client";

import React, { useEffect, useState } from 'react';
// Note: BranchPicker will fetch schools from a server endpoint which
// uses the service role key to avoid client-side RLS restrictions.
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

type School = {
  id: number | string;
  name: string;
  logo_url?: string | null;
  domain?: string | null;
};

// The previous "no schools" setup dialog has been removed per request.
// If there are no schools, BranchPicker will render nothing in that state.

export function BranchGate({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<School | null>(null);
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  const { role, isLoading } = useAuth();

  // Routes that should bypass branch selection
  const bypassRoutes = [
    '/auth/', // All authentication routes
    '/api/', // All API routes
    '/super-admin/', // All super-admin routes
    // Add other routes that shouldn't require branch selection
  ];

  // Check if current path should bypass branch selection
  const routeBypass = bypassRoutes.some(route => pathname?.startsWith(route));
  
  // Check if user is a super-admin (they don't need school selection)
  const roleBypass = role === 'super_admin';
  
  // Combine both bypass conditions
  const shouldBypass = routeBypass || roleBypass;

  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('BranchGate:', { 
      pathname, 
      routeBypass, 
      role, 
      roleBypass, 
      shouldBypass: shouldBypass, 
      selected: !!selected,
      isLoading
    });
  }

  useEffect(() => {
    // If auth is still loading, don't make decisions yet
    if (isLoading) return;
    
    // If we should bypass branch selection, don't check localStorage
    if (shouldBypass) {
      setReady(true);
      return;
    }

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
  }, [shouldBypass, isLoading]);

  function handleSelect(school: School) {
    setSelected(school);
    try {
      localStorage.setItem('selectedSchool', JSON.stringify(school));
    } catch (e) {
      console.error('Failed to persist selectedSchool', e);
    }
  }

  // If auth is still loading, show loading (don't make any branching decisions yet)
  if (isLoading) return null;

  // If we should bypass branch selection, render children directly
  if (shouldBypass) return <>{children}</>;

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

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        // Prefer server endpoint which uses the service role to avoid RLS
        const resp = await fetch('/api/public/schools');
        if (!resp.ok) {
          const body = await resp.text().catch(() => '');
          console.error('Failed to fetch public schools endpoint', resp.status, body);
          if (!mounted) return;
          setSchools([]);
          return;
        }

        const json = await resp.json();
        const data = json?.data ?? [];

        if (!data || data.length === 0) {
          console.log('No schools returned from server endpoint');
          if (!mounted) return;
          setSchools([]);
          return;
        }

        if (!mounted) return;
        setSchools(data);
      } catch (e: any) {
        console.warn('Failed to load schools for BranchPicker - treating as no schools scenario:', e?.message);
        if (!mounted) return;
        setSchools([]);
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
            {schools.length === 0 && !loading ? (
              <>
                <h3 className="text-lg font-semibold">EduSync Platform Setup</h3>
                <p className="text-sm text-muted-foreground">Initialize your educational management platform.</p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold">Select your School Branch</h3>
                <p className="text-sm text-muted-foreground">Choose the branch you want to use for this session.</p>
              </>
            )}
          </div>
        </div>
        <div className="p-6">
          {loading && <div className="py-6">Loading branches…</div>}
          {!loading && (
            <>
              {schools.length === 0 ? (
                // Intentionally render nothing when no schools exist (dialog removed)
                <></>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </>
          )}
        </div>
        <div className="p-4 border-t text-right">
          <small className="text-xs text-muted-foreground">You can change branch later in your profile/settings.</small>
        </div>
      </div>
    </div>
  );
}
