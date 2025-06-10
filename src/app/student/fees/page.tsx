import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { DollarSign } from "lucide-react";

export default function StudentFeesPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary">My Fees</h2>
      <PlaceholderContent 
        title="View Your Fee Statement" 
        icon={DollarSign}
        description="This section will display your detailed fee statement, including tuition fees, other charges, payments made, and outstanding balances. You will also find options for online payment here (future feature)."
      />
    </div>
  );
}
