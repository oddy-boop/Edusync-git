import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { UserCheck } from "lucide-react";

export default function TeacherAttendancePage() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary">Digital Attendance</h2>
      <PlaceholderContent 
        title="Record and Manage Student Attendance" 
        icon={UserCheck}
        description="This section will allow teachers to take daily attendance for their classes. Features will include marking students as present, absent, or late, viewing attendance history, and generating attendance reports."
      />
    </div>
  );
}
