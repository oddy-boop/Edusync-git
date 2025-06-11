
"use client";

import { useState, useEffect } from "react";
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
import { Users, DollarSign, Activity, PlusCircle, Megaphone, Trash2, Send, Target, UserPlus, Banknote, ListChecks, Wrench, Wifi, WifiOff, CheckCircle2, AlertCircle, HardDrive } from "lucide-react";
// Corrected import: REGISTERED_TEACHERS_KEY is removed
import { REGISTERED_STUDENTS_KEY, FEE_PAYMENTS_KEY, ANNOUNCEMENTS_KEY, ANNOUNCEMENT_TARGETS } from "@/lib/constants";
import type { PaymentDetails } from "@/components/shared/PaymentReceipt";
import { parse, isSameMonth, isSameYear, isValid, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

interface RegisteredStudent {
  studentId: string;
}

// Interface for teacher profile stored in Firestore
interface TeacherProfile {
  uid: string;
  fullName: string;
  email: string;
  // other fields...
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

interface QuickActionItem {
  title: string;
  href: string;
  icon: React.ElementType;
  description: string;
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

  const [onlineStatus, setOnlineStatus] = useState(true);
  const [localStorageStatus, setLocalStorageStatus] = useState<"Operational" | "Error" | "Disabled/Error" | "Checking...">("Checking...");
  const [lastHealthCheck, setLastHealthCheck] = useState<string | null>(null);


  useEffect(() => {
    async function fetchDashboardData() {
      if (typeof window !== 'undefined') {
        // Load student stats from localStorage
        const studentsRaw = localStorage.getItem(REGISTERED_STUDENTS_KEY);
        const students: RegisteredStudent[] = studentsRaw ? JSON.parse(studentsRaw) : [];
        const totalStudentsStr = students.length.toString();

        // Load teacher stats from Firestore
        let totalTeachersStr = "0";
        try {
          const teachersCollectionRef = collection(db, "teachers");
          const teacherSnapshots = await getDocs(teachersCollectionRef);
          totalTeachersStr = teacherSnapshots.size.toString();
        } catch (error) {
          console.error("Error fetching teachers for dashboard stats:", error);
          toast({ title: "Error", description: "Could not fetch teacher count.", variant: "destructive" });
        }
        
        // Load payment stats from localStorage
        const paymentsRaw = localStorage.getItem(FEE_PAYMENTS_KEY);
        const allPayments: PaymentDetails[] = paymentsRaw ? JSON.parse(paymentsRaw) : [];
        const currentDate = new Date();
        let monthlyTotal = 0;
        allPayments.forEach(payment => {
          const formatString = 'MMMM do, yyyy'; 
          let paymentDateObj = parse(payment.paymentDate, formatString, new Date());
          
          if (!isValid(paymentDateObj)) {
            const fallbackFormatStrings = ['MMMM d, yyyy', 'M/d/yyyy', 'yyyy-MM-dd'];
            for (const fmt of fallbackFormatStrings) {
              paymentDateObj = parse(payment.paymentDate, fmt, new Date());
              if (isValid(paymentDateObj)) break;
            }
          }

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

        // Load announcements from localStorage
        const announcementsRaw = localStorage.getItem(ANNOUNCEMENTS_KEY);
        const loadedAnnouncements: Announcement[] = announcementsRaw ? JSON.parse(announcementsRaw) : [];
        setAnnouncements(loadedAnnouncements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setIsLoadingAnnouncements(false);

        // Perform Health Checks
        setOnlineStatus(navigator.onLine);
        const handleOnline = () => setOnlineStatus(true);
        const handleOffline = () => setOnlineStatus(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        try {
          const testKey = '__sjm_health_check__';
          localStorage.setItem(testKey, 'ok');
          if (localStorage.getItem(testKey) === 'ok') {
            localStorage.removeItem(testKey);
            setLocalStorageStatus("Operational");
          } else {
            setLocalStorageStatus("Error");
          }
        } catch (e) {
          setLocalStorageStatus("Disabled/Error");
        }
        setLastHealthCheck(new Date().toLocaleTimeString());

        return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
        };
      }
    }
    fetchDashboardData();
  }, [toast]);

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
    // { title: "System Activity", value: "Overview of school activities", icon: Activity, color: "text-purple-500" },
  ];

  const quickActionItems: QuickActionItem[] = [
    { title: "Register Student", href: "/admin/register-student", icon: UserPlus, description: "Add a new student." },
    { title: "Record Payment", href: "/admin/record-payment", icon: Banknote, description: "Log a new fee payment." },
    { title: "Manage Fees", href: "/admin/fees", icon: DollarSign, description: "Configure school fee structure." },
    { title: "Manage Users", href: "/admin/users", icon: Users, description: "View/edit user records." },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-headline font-semibold text-primary">Admin Overview</h2>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"> {/* Adjusted grid to 3 for stats */}
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

      <div className="grid gap-6">
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
                {announcements.slice(0, 3).map(ann => ( 
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
             {announcements.length > 3 && (
                <div className="mt-4 text-center">
                    <Button variant="link" size="sm" asChild>
                        <Link href="/admin/announcements">View All Announcements</Link>
                    </Button>
                </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <ListChecks className="mr-3 h-6 w-6 text-primary" /> Quick Actions
            </CardTitle>
            <CardDescription>Access common administrative tasks quickly.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quickActionItems.map(action => (
              <Button key={action.title} variant="outline" className="h-auto justify-start py-3" asChild>
                <Link href={action.href}>
                  <action.icon className="mr-3 h-5 w-5 text-primary/80" />
                  <div className="flex flex-col">
                    <span className="font-medium">{action.title}</span>
                    <span className="text-xs text-muted-foreground">{action.description}</span>
                  </div>
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
        
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center">
                <Wrench className="mr-3 h-6 w-6 text-primary" /> System Health Monitoring
                </CardTitle>
                <CardDescription>
                    Basic client-side system status checks.
                    {lastHealthCheck && <span className="block text-xs mt-1">Last checked: {lastHealthCheck}</span>}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-md bg-secondary/30">
                    <div className="flex items-center">
                        {onlineStatus ? <Wifi className="h-5 w-5 mr-2 text-green-500"/> : <WifiOff className="h-5 w-5 mr-2 text-destructive"/>}
                        <span className="text-sm font-medium">Internet Connectivity</span>
                    </div>
                    {onlineStatus 
                        ? <span className="text-sm font-semibold text-green-600 flex items-center"><CheckCircle2 className="h-4 w-4 mr-1"/>Online</span> 
                        : <span className="text-sm font-semibold text-destructive flex items-center"><AlertCircle className="h-4 w-4 mr-1"/>Offline</span>}
                </div>
                <div className="flex items-center justify-between p-3 rounded-md bg-secondary/30">
                     <div className="flex items-center">
                        <HardDrive className="h-5 w-5 mr-2 text-blue-500"/>
                        <span className="text-sm font-medium">Browser Storage</span>
                    </div>
                    {localStorageStatus === "Operational" && 
                        <span className="text-sm font-semibold text-green-600 flex items-center"><CheckCircle2 className="h-4 w-4 mr-1"/>{localStorageStatus}</span>}
                    {localStorageStatus === "Checking..." &&
                        <span className="text-sm font-semibold text-muted-foreground">{localStorageStatus}</span>}
                    {(localStorageStatus === "Error" || localStorageStatus === "Disabled/Error") &&
                        <span className="text-sm font-semibold text-destructive flex items-center"><AlertCircle className="h-4 w-4 mr-1"/>{localStorageStatus}</span>}
                </div>
                <p className="text-xs text-muted-foreground pt-2">
                    Note: These are basic client-side checks and do not reflect server health or database status. For full system diagnostics, consult server logs and monitoring tools.
                </p>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
    

    

    

    
