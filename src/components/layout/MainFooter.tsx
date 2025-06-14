
"use client";

import { useState, useEffect, useRef } from 'react';
import { getSupabase } from "@/lib/supabaseClient";
import type { SupabaseClient } from '@supabase/supabase-js';

interface FooterSettings { 
  schoolName: string;
  currentAcademicYear: string;
}

const defaultFooterSettings: FooterSettings = {
  schoolName: "St. Joseph's Montessori",
  currentAcademicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
};

function getCopyrightEndYear(academicYearString?: string | null): string {
  if (academicYearString) {
    const parts = academicYearString.split(/[-–—]/);
    const lastPart = parts[parts.length - 1].trim();
    if (/^\d{4}$/.test(lastPart)) {
      return lastPart;
    }
  }
  return new Date().getFullYear().toString();
}

export function MainFooter() {
  const [footerSettings, setFooterSettings] = useState<FooterSettings>(defaultFooterSettings);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    
    async function fetchFooterSettings() {
      if (!isMounted.current || typeof window === 'undefined') return;
      setIsLoading(true);
      
      let supabase: SupabaseClient | null = null;
      try {
        supabase = getSupabase();
      } catch (initError: any) {
        console.error("MainFooter: Failed to initialize Supabase client:", initError.message);
        if (isMounted.current) {
          setFooterSettings(defaultFooterSettings);
          setIsLoading(false);
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('schoolName, currentAcademicYear')
          .eq('id', 1)
          .single();

        if (isMounted.current) { // Check mount status before setting state
            if (error && error.code !== 'PGRST116') { // PGRST116: single row not found
              let loggableError: any = error;
              // Try to get a more descriptive message if 'error' is just {}
              if (typeof error === 'object' && error !== null && !Object.keys(error).length && !error.message) {
                  loggableError = "Received an empty or non-standard error object from Supabase app_settings fetch.";
              } else if (error instanceof Error || (typeof error === 'object' && error !== null && 'message' in error)) {
                  loggableError = (error as Error).message;
              }
              console.error("MainFooter: Error loading app settings from Supabase:", loggableError, "\nFull error object:", JSON.stringify(error, null, 2));
              setFooterSettings(defaultFooterSettings); // Fallback
            } else if (data) {
              setFooterSettings({
                schoolName: data.schoolName || defaultFooterSettings.schoolName,
                currentAcademicYear: data.currentAcademicYear || defaultFooterSettings.currentAcademicYear,
              });
            } else {
              // No settings found (e.g. PGRST116 or settings row just not there), use defaults
              setFooterSettings(defaultFooterSettings);
              console.warn("MainFooter: No app_settings found in Supabase, using defaults.");
            }
        }
      } catch (e: any) {
        let loggableCatchError: any = e;
        if (typeof e === 'object' && e !== null && !Object.keys(e).length && !e.message) {
             loggableCatchError = "Caught an empty or non-standard error object during app settings fetch.";
        } else if (e instanceof Error || (typeof e === 'object' && e !== null && 'message' in e)) {
            loggableCatchError = (e as Error).message;
        }
        console.error("MainFooter: Exception while fetching app settings:", loggableCatchError, "\nFull exception object:", JSON.stringify(e, null, 2));
        if (isMounted.current) setFooterSettings(defaultFooterSettings); // Fallback
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    }

    fetchFooterSettings();
    
    return () => {
      isMounted.current = false;
    };
  }, []); // Empty dependency array means this runs once on mount

  const copyrightYear = getCopyrightEndYear(footerSettings.currentAcademicYear);

  if (isLoading) {
    // Optional: return a lightweight placeholder or null to avoid layout shift
    // For a footer, it might be okay to just render defaults initially or nothing.
    // Here, we'll render default text while loading.
    return (
        <footer className="py-8 px-6 border-t bg-muted/50">
          <div className="container mx-auto text-center text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} {defaultFooterSettings.schoolName}. Loading...</p>
          </div>
        </footer>
    );
  }

  return (
    <footer className="py-8 px-6 border-t bg-muted/50">
      <div className="container mx-auto text-center text-muted-foreground">
        <p>&copy; {copyrightYear} {footerSettings.schoolName}. All rights reserved.</p>
        <p className="text-sm mt-1">Powered by {footerSettings.schoolName}</p>
      </div>
    </footer>
  );
}
