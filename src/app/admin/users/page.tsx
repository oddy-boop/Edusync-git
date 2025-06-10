import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { Users } from "lucide-react";

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary">User Management</h2>
      <PlaceholderContent 
        title="Manage Teachers, Students, and Staff" 
        icon={Users}
        description="This section will allow administrators to add, edit, and manage user accounts for teachers, students, and other staff members. Features will include role assignments, password resets, and bulk user uploads."
      />
    </div>
  );
}
