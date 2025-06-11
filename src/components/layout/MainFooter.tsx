
"use client";

import { useState, useEffect } from 'react';
import { ACADEMIC_YEAR_SETTING_KEY } from '@/lib/constants';

function getCopyrightEndYear(academicYearString?: string | null): string {
  if (academicYearString) {
    const parts = academicYearString.split(/[-–—]/); // Split by hyphen, en-dash, em-dash
    const lastPart = parts[parts.length - 1].trim();
    if (/^\d{4}$/.test(lastPart)) { // Check if it's a 4-digit year
      return lastPart;
    }
  }
  return new Date().getFullYear().toString();
}

export function MainFooter() {
  const [copyrightYear, setCopyrightYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    let storedAcademicYear: string | null = null;
    if (typeof window !== 'undefined') {
      storedAcademicYear = localStorage.getItem(ACADEMIC_YEAR_SETTING_KEY);
    }
    setCopyrightYear(getCopyrightEndYear(storedAcademicYear));

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === ACADEMIC_YEAR_SETTING_KEY) {
        setCopyrightYear(getCopyrightEndYear(event.newValue));
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange);
      }
    };
  }, []);

  return (
    <footer className="py-8 px-6 border-t bg-muted/50">
      <div className="container mx-auto text-center text-muted-foreground">
        <p>&copy; {copyrightYear} St. Joseph's Montessori. All rights reserved.</p>
        <p className="text-sm mt-1">Powered by St. Joseph's Montessori</p>
      </div>
    </footer>
  );
}
