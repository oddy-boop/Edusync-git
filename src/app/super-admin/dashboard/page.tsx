
"use client";

import SuperAdminDashboard from '@/components/shared/SuperAdminDashboard';

export default function SuperAdminDashboardPage() {
    // The auth check is handled by the layout and middleware.
    // A user reaching this page is assumed to be a super_admin.
    return <SuperAdminDashboard />;
}
