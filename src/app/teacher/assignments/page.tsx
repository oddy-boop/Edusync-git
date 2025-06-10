import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { Edit } from "lucide-react";

export default function TeacherAssignmentsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary">Assignment Management</h2>
      <PlaceholderContent 
        title="Create, Distribute, and Grade Assignments" 
        icon={Edit}
        description="This module allows teachers to create new assignments, upload materials, set deadlines, distribute them to students, and grade submissions. Features will include various question types, plagiarism detection (future), and feedback tools."
      />
    </div>
  );
}
