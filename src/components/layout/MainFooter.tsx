
"use client";

import { useState, useEffect, useRef } from 'react';
import { getSupabase } from "@/lib/supabaseClient";

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
      const supabase = getSupabase();
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('schoolName, currentAcademicYear')
          .eq('id', 1)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116: single row not found
          console.error("MainFooter: Error loading app settings from Supabase:", error);
          if (isMounted.current) setFooterSettings(defaultFooterSettings); // Fallback
        } else if (data) {
          if (isMounted.current) {
            setFooterSettings({
              schoolName: data.schoolName || defaultFooterSettings.schoolName,
              currentAcademicYear: data.currentAcademicYear || defaultFooterSettings.currentAcademicYear,
            });
          }
        } else {
          // No settings found, use defaults
          if (isMounted.current) setFooterSettings(defaultFooterSettings);
          console.warn("MainFooter: No app_settings found in Supabase, using defaults.");
        }
      } catch (error) {
        console.error("MainFooter: Exception while fetching app settings:", error);
        if (isMounted.current) setFooterSettings(defaultFooterSettings); // Fallback
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    }

    fetchFooterSettings();
    
    return () => {
      isMounted.current = false;
    };
  }, []);

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
