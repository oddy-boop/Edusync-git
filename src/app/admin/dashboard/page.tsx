
"use client";

import { useState, useEffect } from "react";
import { PlaceholderContent } from "@/components/shared/PlaceholderContent";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Users, DollarSign, Activity, Settings, TrendingUp, PlusCircle, Megaphone, Trash2, Send, Target } from "lucide-react";
import { REGISTERED_STUDENTS_KEY, REGISTERED_TEACHERS_KEY, FEE_PAYMENTS_KEY, ANNOUNCEMENTS_KEY, ANNOUNCEMENT_TARGETS } from "@/lib/constants";
import type { PaymentDetails } from "@/components/shared/PaymentReceipt";
import { parse, isSameMonth, isSameYear, isValid, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface RegisteredStudent {
  studentId: string;
}

interface RegisteredTeacher {
  email: string;
}

interface DashboardStats {
  totalStudents: string;
  totalTeachers: string;
  feesCollectedThisMonth: string;
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  target: "All" | "Students" | "Teachers";
  author: string;
  createdAt: string; // ISO string date
}

export default function AdminDashboardPage() {
  const { toast } = useToast();
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalStudents: "0",
    totalTeachers: "0",
    feesCollectedThisMonth: "GHS 0.00",
  });

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isAnnouncementDialogOpen, setIsAnnouncementDialogOpen] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState<Omit<Announcement, 'id' | 'createdAt' | 'author'>>({ title: "", message: "", target: "All" });
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Load dashboard stats
      const studentsRaw = localStorage.getItem(REGISTERED_STUDENTS_KEY);
      const students: RegisteredStudent[] = studentsRaw ? JSON.parse(studentsRaw) : [];
      const totalStudentsStr = students.length.toString();

      const teachersRaw = localStorage.getItem(REGISTERED_TEACHERS_KEY);
      const teachers: RegisteredTeacher[] = teachersRaw ? JSON.parse(teachersRaw) : [];
      const totalTeachersStr = teachers.length.toString();

      const paymentsRaw = localStorage.getItem(FEE_PAYMENTS_KEY);
      const allPayments: PaymentDetails[] = paymentsRaw ? JSON.parse(paymentsRaw) : [];
      const currentDate = new Date();
      let monthlyTotal = 0;
      allPayments.forEach(payment => {
        const formatString = 'MMMM do, yyyy';
        const paymentDateObj = parse(payment.paymentDate, formatString, new Date());
        if (isValid(paymentDateObj)) {
          if (isSameMonth(paymentDateObj, currentDate) && isSameYear(paymentDateObj, currentDate)) {
            monthlyTotal += payment.amountPaid;
          }
        }
      });
      const feesCollectedThisMonthStr = `GHS ${monthlyTotal.toFixed(2)}`;

      setDashboardStats({
        totalStudents: totalStudentsStr,
        totalTeachers: totalTeachersStr,
        feesCollectedThisMonth: feesCollectedThisMonthStr,
      });

      // Load announcements
      const announcementsRaw = localStorage.getItem(ANNOUNCEMENTS_KEY);
      const loadedAnnouncements: Announcement[] = announcementsRaw ? JSON.parse(announcementsRaw) : [];
      setAnnouncements(loadedAnnouncements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setIsLoadingAnnouncements(false);
    }
  }, []);

  // Effect to reset form when dialog closes
  useEffect(() => {
    if (!isAnnouncementDialogOpen) {
      setNewAnnouncement({ title: "", message: "", target: "All" });
    }
  }, [isAnnouncementDialogOpen]);

  const handleSaveAnnouncement = () => {
    if (!newAnnouncement.title.trim() || !newAnnouncement.message.trim()) {
      toast({ title: "Error", description: "Title and message are required.", variant: "destructive" });
      return;
    }
    const announcementToAdd: Announcement = {
      ...newAnnouncement,
      id: `ANCMT-${Date.now()}`,
      author: "Admin",
      createdAt: new Date().toISOString(),
    };
    const updatedAnnouncements = [announcementToAdd, ...announcements];
    setAnnouncements(updatedAnnouncements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    if (typeof window !== 'undefined') {
      localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(updatedAnnouncements));
    }
    toast({ title: "Success", description: "Announcement posted successfully." });
    setIsAnnouncementDialogOpen(false);
  };

  const handleDeleteAnnouncement = (id: string) => {
    const updatedAnnouncements = announcements.filter(ann => ann.id !== id);
    setAnnouncements(updatedAnnouncements);
    if (typeof window !== 'undefined') {
      localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(updatedAnnouncements));
    }
    toast({ title: "Success", description: "Announcement deleted." });
  };

  const statsCards = [
    { title: "Total Students", value: dashboardStats.totalStudents, icon: Users, color: "text-blue-500" },
    { title: "Total Teachers", value: dashboardStats.totalTeachers, icon: Users, color: "text-green-500" },
    { title: "Fees Collected (This Month)", value: dashboardStats.feesCollectedThisMonth, icon: DollarSign, color: "text-yellow-500" },
    { title: "System Activity", value: "Overview of school activities", icon: Activity, color: "text-purple-500" },
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

      <div className="grid gap-6"> {/* Announcements card in its own full-width row */}
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="space-y-1">
              <CardTitle className="text-xl font-semibold text-primary flex items-center">
                <Megaphone className="mr-3 h-6 w-6" /> Manage Announcements
              </CardTitle>
              <CardDescription>Create, view, and delete school-wide announcements.</CardDescription>
            </div>
            <Dialog open={isAnnouncementDialogOpen} onOpenChange={setIsAnnouncementDialogOpen}>
              <DialogTrigger asChild>
                <Button size="default">
                  <PlusCircle className="mr-2 h-4 w-4" /> Create New Announcement
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center"><Send className="mr-2 h-5 w-5" /> Create New Announcement</DialogTitle>
                  <DialogDescription>Compose and target your announcement.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="annTitle" className="text-right">Title</Label>
                    <Input id="annTitle" value={newAnnouncement.title} onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))} className="col-span-3" placeholder="Important Update" />
                  </div>
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="annMessage" className="text-right pt-2">Message</Label>
                    <Textarea id="annMessage" value={newAnnouncement.message} onChange={(e) => setNewAnnouncement(prev => ({ ...prev, message: e.target.value }))} className="col-span-3 min-h-[100px]" placeholder="Details of the announcement..." />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="annTarget" className="text-right flex items-center"><Target className="mr-1 h-4 w-4"/>Target</Label>
                    <Select value={newAnnouncement.target} onValueChange={(value: "All" | "Students" | "Teachers") => setNewAnnouncement(prev => ({ ...prev, target: value }))}>
                      <SelectTrigger className="col-span-3" id="annTarget">
                        <SelectValue placeholder="Select target audience" />
                      </SelectTrigger>
                      <SelectContent>
                        {ANNOUNCEMENT_TARGETS.map(target => (
                          <SelectItem key={target.value} value={target.value}>{target.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAnnouncementDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveAnnouncement}><Send className="mr-2 h-4 w-4" /> Post Announcement</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {isLoadingAnnouncements ? (
              <p className="text-muted-foreground">Loading announcements...</p>
            ) : announcements.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No announcements posted yet.</p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {announcements.slice(0, 5).map(ann => ( // Display up to 5 recent ones
                  <Card key={ann.id} className="bg-secondary/30">
                    <CardHeader className="pb-2 pt-3 px-4">
                      <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-base">{ann.title}</CardTitle>
                            <CardDescription className="text-xs">
                                For: {ann.target} | By: {ann.author} | {formatDistanceToNow(new Date(ann.createdAt), { addSuffix: true })}
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteAnnouncement(ann.id)} className="text-destructive hover:text-destructive/80 h-7 w-7">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                      <p className="text-sm whitespace-pre-wrap line-clamp-3">{ann.message}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <PlaceholderContent title="System Health" icon={Settings} description="Monitor system status and performance metrics." />
        <PlaceholderContent title="Quick Actions" icon={DollarSign} description="Access common administrative tasks quickly from here." />
      </div>
    </div>
  );
}

    