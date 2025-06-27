"use client";

import { useState, useEffect, useRef } from 'react';
import { getSupabase } from "@/lib/supabaseClient";
import type { SupabaseClient } from '@supabase/supabase-js';

interface FooterSettings {
  school_name: string;
  current_academic_year: string;
}

const defaultFooterSettings: FooterSettings = {
  school_name: "St. Joseph's Montessori",
  current_academic_year: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
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
        console.error("MainFooter: Failed to initialize Supabase client:", initError.message, "\nFull error object:", JSON.stringify(initError, null, 2));
        if (isMounted.current) {
          setFooterSettings(defaultFooterSettings);
          setIsLoading(false);
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('school_name, current_academic_year')
          .eq('id', 1)
          .single();

        if (isMounted.current) {
            if (error && error.code !== 'PGRST116') {
              let loggableError: any = error;
              if (typeof error === 'object' && error !== null && !Object.keys(error).length && !error.message) {
                  loggableError = "Received an empty or non-standard error object from Supabase app_settings fetch.";
              } else if (error instanceof Error || (typeof error === 'object' && error !== null && 'message' in error)) {
                  loggableError = (error as Error).message;
              }
              console.error("MainFooter: Error loading app settings from Supabase:", loggableError, "\nFull error object:", JSON.stringify(error, null, 2));
              setFooterSettings(defaultFooterSettings);
            } else if (data) {
              setFooterSettings({
                school_name: data.school_name || defaultFooterSettings.school_name,
                current_academic_year: data.current_academic_year || defaultFooterSettings.current_academic_year,
              });
            } else {
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
        if (isMounted.current) setFooterSettings(defaultFooterSettings);
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    }

    fetchFooterSettings();
    
    return () => {
      isMounted.current = false;
    };
  }, []);

  const copyrightYear = getCopyrightEndYear(footerSettings.current_academic_year);

  if (isLoading) {
    return (
        <footer className="py-8 px-6 border-t bg-muted/50">
          <div className="container mx-auto text-center text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} {defaultFooterSettings.school_name}. Loading...</p>
          </div>
        </footer>
    );
  }

  return (
    <footer className="py-8 px-6 border-t bg-muted/50">
      <div className="container mx-auto text-center text-muted-foreground">
        <p>&copy; {copyrightYear} {footerSettings.school_name}. All rights reserved.</p>
        <p className="text-sm mt-1">Powered by Richard Odoom</p>
      </div>
    </footer>
  );
}
