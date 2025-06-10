import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { BarChart2 } from "lucide-react";

export default function StudentProgressPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary">My Progress</h2>
      <PlaceholderContent 
        title="Track Your Academic Journey" 
        icon={BarChart2}
        description="This section will provide visual representations of your academic progress over time. Features will include charts for subject-wise performance, attendance trends, and comparison with class averages (where applicable)."
      />
    </div>
  );
}
