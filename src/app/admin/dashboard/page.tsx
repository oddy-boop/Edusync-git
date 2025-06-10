import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, Activity } from "lucide-react";

export default function AdminDashboardPage() {
  const stats = [
    { title: "Total Students", value: "1,250", icon: Users, color: "text-blue-500" },
    { title: "Total Teachers", value: "75", icon: Users, color: "text-green-500" },
    { title: "Fees Collected (This Month)", value: "GHS 85,000", icon: DollarSign, color: "text-yellow-500" },
    { title: "Recent Activity", value: "3 New Registrations", icon: Activity, color: "text-purple-500" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary">Admin Overview</h2>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stat.value}</div>
              {/* <p className="text-xs text-muted-foreground">+20.1% from last month</p> */}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <PlaceholderContent title="Recent Announcements" icon={Activity} description="Manage and view school-wide announcements here." />
        <PlaceholderContent title="System Health" icon={Settings} description="Monitor system status and performance metrics." />
      </div>
       <PlaceholderContent title="Quick Actions" icon={DollarSign} description="Access common administrative tasks quickly from here." />
    </div>
  );
}
