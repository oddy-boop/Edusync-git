"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

type School = {
  id: number | string;
  name: string;
  logo_url?: string | null;
  domain?: string | null;
};

// Component to show when no schools exist - guides user to create first school
function SetupFirstSchool() {
  return (
    <div className="text-center py-8">
      <div className="mb-6">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Welcome to EduSync!
        </h3>
        <p className="text-gray-600 mb-6">
          No schools have been set up yet. To get started, you'll need to create your first school as a super administrator.
        </p>
      </div>
      
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
          <h4 className="font-medium text-blue-900 mb-2">👑 Super Administrator Setup</h4>
          <p className="text-sm text-blue-700 mb-3">
            As a super administrator, you can create and manage schools across the platform.
          </p>
          <a
            href="/auth/super-admin/login"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Super Admin Login
          </a>
        </div>
        
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-left">
          <h4 className="font-medium text-gray-900 mb-2">🏫 School Administrator</h4>
          <p className="text-sm text-gray-600 mb-3">
            If you're a school administrator, ask your super administrator to create your school first.
          </p>
          <button
            className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            disabled
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Waiting for School Setup
          </button>
        </div>
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Need help? Contact your system administrator or refer to the EduSync documentation.
        </p>
      </div>
    </div>
  );
}

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
        const supabase = createClient();
        const { data, error } = await supabase.from('schools').select('id, name, domain, logo_url');
        
        // If we get an error or no data, treat it as no schools scenario
        if (error || !data || data.length === 0) {
          console.log('No schools found or error fetching schools:', error?.message);
          if (!mounted) return;
          setSchools([]);
          return;
        }
        
        if (!mounted) return;
        setSchools(data);
      } catch (e: any) {
        console.warn('Failed to load schools for BranchPicker - treating as no schools scenario:', e?.message);
        // Instead of showing error, treat as no schools scenario
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
                <SetupFirstSchool />
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
