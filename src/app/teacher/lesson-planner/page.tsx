import { LessonPlannerForm } from "@/components/forms/LessonPlannerForm";

export default function AILessonPlannerPage() {
  return (
    <div className="space-y-6">
      {/* Title is handled by the form component now */}
      <LessonPlannerForm />
    </div>
  );
}
