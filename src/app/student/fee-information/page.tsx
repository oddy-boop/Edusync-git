
import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { Info } from "lucide-react";

export default function StudentFeeInformationPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary">Fee Information</h2>
      <PlaceholderContent 
        title="General School Fee Information" 
        icon={Info}
        description="This section will provide general information about the school's fee policies, payment deadlines, accepted payment methods, and contact details for the accounts office. For your specific fee statement and balance, please check the 'My Fees' section."
      />
    </div>
  );
}
