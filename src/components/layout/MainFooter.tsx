
"use client";

import { useState, useEffect } from 'react';
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

const APP_SETTINGS_DOC_ID = "general";
const APP_SETTINGS_COLLECTION = "appSettings";

const defaultFooterSettings = {
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
    const settingsDocRef = doc(db, APP_SETTINGS_COLLECTION, APP_SETTINGS_DOC_ID);
    
    const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const settingsData = docSnap.data();
        setFooterSettings({
          schoolName: settingsData.schoolName || defaultFooterSettings.schoolName,
          currentAcademicYear: settingsData.currentAcademicYear || defaultFooterSettings.currentAcademicYear,
        });
      } else {
        setFooterSettings(defaultFooterSettings);
      }
    }, (error) => {
      console.error("MainFooter: Error listening to Firestore settings:", error);
      setFooterSettings(defaultFooterSettings);
    });

    return () => unsubscribe();
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
    

    