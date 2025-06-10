import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { CalendarCheck2 } from "lucide-react";

export default function StudentAttendancePage() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary">My Attendance</h2>
      <PlaceholderContent 
        title="View Your Attendance Record" 
        icon={CalendarCheck2}
        description="This section will show your daily and cumulative attendance records for all subjects. You can view details for specific dates and track your attendance percentage."
      />
    </div>
  );
}
