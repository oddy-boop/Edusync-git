
"use client";

import { useState, useEffect } from 'react';
// Firebase db import removed
import { APP_SETTINGS_KEY } from "@/lib/constants"; // Using new localStorage key

interface FooterSettings { // Simplified for footer needs
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
  const [footerSettings, setFooterSettings] = useState(defaultFooterSettings);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const settingsRaw = localStorage.getItem(APP_SETTINGS_KEY);
        if (settingsRaw) {
          const settings = JSON.parse(settingsRaw);
          setFooterSettings({
            schoolName: settings.schoolName || defaultFooterSettings.schoolName,
            currentAcademicYear: settings.currentAcademicYear || defaultFooterSettings.currentAcademicYear,
          });
        } else {
          setFooterSettings(defaultFooterSettings);
        }
      } catch (error) {
        console.error("MainFooter: Error loading app settings from localStorage:", error);
        setFooterSettings(defaultFooterSettings);
      }
    }
  }, []);

  const copyrightYear = getCopyrightEndYear(footerSettings.currentAcademicYear);

  return (
    <footer className="py-8 px-6 border-t bg-muted/50">
      <div className="container mx-auto text-center text-muted-foreground">
        <p>&copy; {copyrightYear} {footerSettings.schoolName}. All rights reserved.</p>
        <p className="text-sm mt-1">Powered by {footerSettings.schoolName}</p>
      </div>
    </footer>
  );
}
