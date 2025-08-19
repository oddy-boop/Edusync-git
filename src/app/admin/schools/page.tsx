
"use client";
import { redirect } from 'next/navigation';

// This page is now located at /super-admin/schools
export default function OldSchoolsPage() {
    redirect('/super-admin/schools');
}
