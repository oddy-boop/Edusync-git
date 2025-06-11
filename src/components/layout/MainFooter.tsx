
"use client";

import { useState, useEffect } from 'react';
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

const APP_SETTINGS_DOC_ID = "general";
const APP_SETTINGS_COLLECTION = "appSettings";

function getCopyrightEndYear(academicYearString?: string | null): string {
  if (academicYearString) {
    const parts = academicYearString.split(/[-–—]/); // Split by hyphen, en-dash, em-dash
    const lastPart = parts[parts.length - 1].trim();
    if (/^\d{4}$/.test(lastPart)) { // Check if it's a 4-digit year
      return lastPart;
    }
  }
  // Fallback if parsing fails or no string is provided
  return new Date().getFullYear().toString();
}

export function MainFooter() {
  const [copyrightYear, setCopyrightYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    // Set up a Firestore listener for the academic year setting
    const settingsDocRef = doc(db, APP_SETTINGS_COLLECTION, APP_SETTINGS_DOC_ID);
    
    const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const settingsData = docSnap.data();
        const academicYearFromFirestore = settingsData.currentAcademicYear;
        // console.log("MainFooter: Academic year from Firestore:", academicYearFromFirestore);
        setCopyrightYear(getCopyrightEndYear(academicYearFromFirestore));
      } else {
        // console.log("MainFooter: No 'general' settings document in Firestore. Using default year.");
        // If doc doesn't exist, use default (current year)
        setCopyrightYear(new Date().getFullYear().toString());
      }
    }, (error) => {
      console.error("MainFooter: Error listening to Firestore settings:", error);
      // Fallback to current year on error
      setCopyrightYear(new Date().getFullYear().toString());
    });

    // Cleanup listener on component unmount
    return () => unsubscribe();
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
    