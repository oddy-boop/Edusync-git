
"use client";

import { useState, useEffect } from "react";
import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, Activity, Settings, TrendingUp } from "lucide-react";
import { REGISTERED_STUDENTS_KEY, REGISTERED_TEACHERS_KEY, FEE_PAYMENTS_KEY } from "@/lib/constants";
import type { PaymentDetails } from "@/components/shared/PaymentReceipt"; 
import { parse, isSameMonth, isSameYear, isValid } from "date-fns";

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
        // paymentDate is expected to be like "July 26th, 2024" due to "PPP" format in date-fns v3
        const formatString = 'MMMM do, yyyy'; 
        const paymentDateObj = parse(payment.paymentDate, formatString, new Date());

        if (isValid(paymentDateObj)) {
          if (isSameMonth(paymentDateObj, currentDate) && isSameYear(paymentDateObj, currentDate)) {
            monthlyTotal += payment.amountPaid;
          }
        } else {
          // Optional: console.warn for debugging if a date string doesn't parse
          // console.warn(`Could not parse date: "${payment.paymentDate}" with format "${formatString}"`);
        }
      });
      const feesCollectedThisMonthStr = `GHS ${monthlyTotal.toFixed(2)}`;

      // For Recent Activity, a more complex system (e.g. with timestamps) is needed.
      // For now, we'll set a more generic message.
      const recentActivityStr = "Overview of school activities"; 

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
    { title: "Total Teachers", value: dashboardStats.totalTeachers, icon: Users, color: "text-green-500" },
    { title: "Fees Collected (This Month)", value: dashboardStats.feesCollectedThisMonth, icon: DollarSign, color: "text-yellow-500" },
    { title: "System Activity", value: dashboardStats.recentActivity, icon: Activity, color: "text-purple-500" },
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
