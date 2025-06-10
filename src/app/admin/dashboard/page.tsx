
"use client";

import { useState, useEffect } from "react";
import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, Activity, Settings, TrendingUp } from "lucide-react";
import { REGISTERED_STUDENTS_KEY, REGISTERED_TEACHERS_KEY, FEE_PAYMENTS_KEY } from "@/lib/constants";
import type { PaymentDetails } from "@/components/shared/PaymentReceipt"; // Assuming this type is available
import { parse, isSameMonth, isSameYear, startOfMonth } from "date-fns";

// Simplified interfaces for data from localStorage
interface RegisteredStudent {
  studentId: string;
  // other fields if necessary for count
}

interface RegisteredTeacher {
  email: string;
  // other fields if necessary for count
}

interface DashboardStats {
  totalStudents: string;
  totalTeachers: string;
  feesCollectedThisMonth: string;
  recentActivity: string;
}

export default function AdminDashboardPage() {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalStudents: "Loading...",
    totalTeachers: "Loading...",
    feesCollectedThisMonth: "Loading...",
    recentActivity: "Loading...",
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Fetch total students
      const studentsRaw = localStorage.getItem(REGISTERED_STUDENTS_KEY);
      const students: RegisteredStudent[] = studentsRaw ? JSON.parse(studentsRaw) : [];
      const totalStudentsStr = students.length.toString();

      // Fetch total teachers
      const teachersRaw = localStorage.getItem(REGISTERED_TEACHERS_KEY);
      const teachers: RegisteredTeacher[] = teachersRaw ? JSON.parse(teachersRaw) : [];
      const totalTeachersStr = teachers.length.toString();

      // Fetch and calculate fees collected this month
      const paymentsRaw = localStorage.getItem(FEE_PAYMENTS_KEY);
      const allPayments: PaymentDetails[] = paymentsRaw ? JSON.parse(paymentsRaw) : [];
      
      const currentDate = new Date();
      let monthlyTotal = 0;
      allPayments.forEach(payment => {
        try {
          // The paymentDate is stored as "Month Day, Year" e.g. "July 25, 2024"
          // We need to parse it correctly. `parse` from date-fns can handle various formats if specified.
          // A common format for "PPP" is "MMM d, yyyy" or "MMMM d, yyyy".
          // Let's try parsing with a few common variations if "PPP" is locale-dependent.
          // For "July 25, 2024", 'MMMM d, yyyy' should work.
          const paymentDateObj = parse(payment.paymentDate, 'MMMM d, yyyy', new Date());
          if (isSameMonth(paymentDateObj, currentDate) && isSameYear(paymentDateObj, currentDate)) {
            monthlyTotal += payment.amountPaid;
          }
        } catch (e) {
          console.error(`Error parsing date string "${payment.paymentDate}":`, e);
          // Attempt with another common format if the first fails, or log and skip
           try {
            const paymentDateObjAlt = parse(payment.paymentDate, 'MMM d, yyyy', new Date());
             if (isSameMonth(paymentDateObjAlt, currentDate) && isSameYear(paymentDateObjAlt, currentDate)) {
              monthlyTotal += payment.amountPaid;
            }
           } catch (e2) {
             console.error(`Error parsing date string (alt) "${payment.paymentDate}":`, e2);
           }
        }
      });
      const feesCollectedThisMonthStr = `GHS ${monthlyTotal.toFixed(2)}`;

      // For Recent Activity, a more complex system (e.g. with timestamps) is needed.
      // For now, we'll set a more generic message.
      const recentActivityStr = "Overview of school activities"; // Or: `${students.length + teachers.length} Total Users` 

      setDashboardStats({
        totalStudents: totalStudentsStr,
        totalTeachers: totalTeachersStr,
        feesCollectedThisMonth: feesCollectedThisMonthStr,
        recentActivity: recentActivityStr,
      });
    }
  }, []);

  const statsCards = [
    { title: "Total Students", value: dashboardStats.totalStudents, icon: Users, color: "text-blue-500" },
    { title: "Total Teachers", value: dashboardStats.totalTeachers, icon: Users, color: "text-green-500" }, // Changed icon for variety
    { title: "Fees Collected (This Month)", value: dashboardStats.feesCollectedThisMonth, icon: DollarSign, color: "text-yellow-500" },
    { title: "System Activity", value: dashboardStats.recentActivity, icon: Activity, color: "text-purple-500" }, // Renamed for clarity
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary">Admin Overview</h2>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Card key={stat.title} className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stat.value}</div>
              {/* Example subtext, could be dynamic if we had previous month's data */}
              {stat.title === "Fees Collected (This Month)" && (
                <p className="text-xs text-muted-foreground">
                  As of {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <PlaceholderContent title="Recent Announcements" icon={TrendingUp} description="Manage and view school-wide announcements here." />
        <PlaceholderContent title="System Health" icon={Settings} description="Monitor system status and performance metrics." />
      </div>
       <PlaceholderContent title="Quick Actions" icon={DollarSign} description="Access common administrative tasks quickly from here." />
    </div>
  );
}
