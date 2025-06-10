import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { BookCheck, Lock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function StudentResultsPage() {
  const feesPaid = false; // This would come from a data source in a real app

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary">My Results</h2>
      
      {!feesPaid && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/10 text-destructive dark:border-destructive [&>svg]:text-destructive">
          <Lock className="h-5 w-5" />
          <AlertTitle className="font-semibold">Access Denied: Outstanding Fees</AlertTitle>
          <AlertDescription>
            Your results are currently unavailable due to outstanding fee payments. 
            Please clear your balance to access your academic records.
            <Button variant="link" asChild className="p-0 h-auto ml-2 text-destructive hover:text-destructive/80">
                <Link href="/student/fees">View Fee Statement</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <PlaceholderContent 
        title="Academic Results" 
        icon={BookCheck}
        description={
          feesPaid 
          ? "This section will display your term-wise and subject-wise academic results, including scores, grades, and teacher remarks. You can download your report cards from here."
          : "Once fees are cleared, your academic results will be accessible here."
        }
      />
    </div>
  );
}
