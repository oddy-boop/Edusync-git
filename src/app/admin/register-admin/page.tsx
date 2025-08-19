
"use client";
import { redirect } from 'next/navigation';

// This page is now located at /super-admin/register-admin
export default function OldRegisterAdminPage() {
    redirect('/super-admin/register-admin');
}
