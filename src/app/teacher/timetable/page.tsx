import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { CalendarDays } from "lucide-react";

export default function TeacherTimetablePage() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary">My Timetable</h2>
      <PlaceholderContent 
        title="View Your Teaching Schedule" 
        icon={CalendarDays}
        description="This section will display your personalized teaching timetable, including subjects, classes, timings, and locations. You'll be able to view daily, weekly, and monthly schedules."
      />
    </div>
  );
}
