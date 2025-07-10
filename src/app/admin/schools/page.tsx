
"use client";

import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { School } from "lucide-react";

export default function SchoolsPage() {
    return (
        <PlaceholderContent
            title="SaaS Feature Removed"
            icon={School}
            description="This page was used for managing multiple school instances in the SaaS version. Since the platform has been configured for a single school, this page is no longer needed."
        />
    )
}
