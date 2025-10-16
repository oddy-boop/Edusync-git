"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function PaymentConfigPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the settings page where payment configuration is handled
    router.replace("/admin/settings#payment-gateway");
  }, [router]);

  return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="h-8 w-8 animate-spin" />
      <p className="ml-4 text-lg text-muted-foreground">
        Redirecting to payment settings...
      </p>
    </div>
  );
}
