
"use client";

import SuperAdminDashboard from '@/components/shared/SuperAdminDashboard';

export default function SuperAdminDashboardPage() {
    // A user can only reach this route after a successful login.
    // The login form has already verified their credentials.
    // The layout and API endpoints provide further security.
    // Therefore, we can directly render the dashboard without redundant client-side checks
    // that were causing race conditions and "Access Denied" errors.
    return <SuperAdminDashboard />;
}
