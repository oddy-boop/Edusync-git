
"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Users, DollarSign, PlusCircle, Megaphone, Trash2, Send, Target, UserPlus, Banknote, ListChecks, Wrench, Wifi, WifiOff, CheckCircle2, AlertCircle, HardDrive, Loader2 } from "lucide-react";
import { ANNOUNCEMENTS_KEY, ANNOUNCEMENT_TARGETS, REGISTERED_STUDENTS_KEY, REGISTERED_TEACHERS_KEY, FEE_PAYMENTS_KEY } from "@/lib/constants"; // Added new keys
import { formatDistanceToNow, startOfMonth, endOfMonth } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
// Firebase db import removed
// import { db } from "@/lib/firebase";
// import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";

interface StudentDocument { studentId: string; fullName: string; /* other fields */ }
interface TeacherProfile { uid: string; fullName: string; /* other fields */ }
interface PaymentDetails { amountPaid: number; paymentDate: string; /* ISO string */ } // paymentTimestamp becomes paymentDate

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
  const [dashboardStats, setDashboardStats] = useState({
    totalStudents: "0",
    totalTeachers: "0",
    feesCollectedThisMonth: "GHS 0.00",
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isAnnouncementDialogOpen, setIsAnnouncementDialogOpen] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState<Omit<Announcement, 'id' | 'createdAt' | 'author'>>({ title: "", message: "", target: "All" });
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(true);

  const [onlineStatus, setOnlineStatus] = useState(true);
  const [localStorageStatus, setLocalStorageStatus] = useState<"Operational" | "Error" | "Disabled/Error" | "Checking...">("Checking...");
  const [lastHealthCheck, setLastHealthCheck] = useState<string | null>(null);


  useEffect(() => {
    let isMounted = true;
    setIsLoadingStats(true);
    setIsLoadingAnnouncements(true);

    async function fetchDashboardData() {
      let totalStudentsStr = "0";
      let totalTeachersStr = "0";
      let feesCollectedThisMonthStr = "GHS 0.00";

      if (typeof window !== 'undefined') {
        try {
          const studentsRaw = localStorage.getItem(REGISTERED_STUDENTS_KEY);
          const students: StudentDocument[] = studentsRaw ? JSON.parse(studentsRaw) : [];
          totalStudentsStr = students.length.toString();
        } catch (error) {
          console.error("Error fetching students from localStorage:", error);
          if (isMounted) toast({ title: "Error", description: "Could not fetch student count from localStorage.", variant: "destructive" });
        }

        try {
          const teachersRaw = localStorage.getItem(REGISTERED_TEACHERS_KEY);
          const teachers: TeacherProfile[] = teachersRaw ? JSON.parse(teachersRaw) : [];
          totalTeachersStr = teachers.length.toString();
        } catch (error) {
          console.error("Error fetching teachers from localStorage:", error);
          if (isMounted) toast({ title: "Error", description: "Could not fetch teacher count from localStorage.", variant: "destructive" });
        }
        
        try {
          const now = new Date();
          const currentMonthStart = startOfMonth(now);
          const currentMonthEnd = endOfMonth(now);

          const paymentsRaw = localStorage.getItem(FEE_PAYMENTS_KEY);
          const allPayments: PaymentDetails[] = paymentsRaw ? JSON.parse(paymentsRaw) : [];
          
          let monthlyTotal = 0;
          allPayments.forEach(payment => {
            const paymentDate = new Date(payment.paymentDate); // Assuming paymentDate is ISO string
            if (paymentDate >= currentMonthStart && paymentDate <= currentMonthEnd) {
              monthlyTotal += payment.amountPaid || 0;
            }
          });
          feesCollectedThisMonthStr = `GHS ${monthlyTotal.toFixed(2)}`;
        } catch (error) {
            console.error("Error fetching payments from localStorage:", error);
            if (isMounted) toast({ title: "Error", description: "Could not fetch monthly fee totals from localStorage.", variant: "destructive" });
            feesCollectedThisMonthStr = "GHS Error";
        }

        const announcementsRaw = localStorage.getItem(ANNOUNCEMENTS_KEY);
        const loadedAnnouncements: Announcement[] = announcementsRaw ? JSON.parse(announcementsRaw) : [];
        if(isMounted) setAnnouncements(loadedAnnouncements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }


      if (isMounted) {
        setDashboardStats({
          totalStudents: totalStudentsStr,
          totalTeachers: totalTeachersStr,
          feesCollectedThisMonth: feesCollectedThisMonthStr,
        });
        setIsLoadingStats(false);
        setIsLoadingAnnouncements(false);

        // Perform Health Checks
        if (typeof window !== 'undefined') {
          setOnlineStatus(navigator.onLine);
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
        }
      }
    }
    
    fetchDashboardData();

    const handleOnline = () => { if (isMounted) setOnlineStatus(true); };
    const handleOffline = () => { if (isMounted) setOnlineStatus(false); };

    if (typeof window !== 'undefined') {
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
    }

    return () => {
      isMounted = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
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
    toast({ title: "Success", description: "Announcement posted successfully to localStorage." });
    setIsAnnouncementDialogOpen(false);
  };

  const handleDeleteAnnouncement = (id: string) => {
    const updatedAnnouncements = announcements.filter(ann => ann.id !== id);
    setAnnouncements(updatedAnnouncements);
    if (typeof window !== 'undefined') {
      localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(updatedAnnouncements));
    }
    toast({ title: "Success", description: "Announcement deleted from localStorage." });
  };

  const statsCards = [
    { title: "Total Students", valueKey: "totalStudents", icon: Users, color: "text-blue-500" },
    { title: "Total Teachers", valueKey: "totalTeachers", icon: Users, color: "text-green-500" },
    { title: "Fees Collected (This Month)", valueKey: "feesCollectedThisMonth", icon: DollarSign, color: "text-yellow-500" },
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
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {statsCards.map((stat) => (
          <Card key={stat.title} className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <div className="text-2xl font-bold text-primary">{dashboardStats[stat.valueKey as keyof typeof dashboardStats]}</div>
              )}
              {stat.title === "Fees Collected (This Month)" && !isLoadingStats && (
                <p className="text-xs text-muted-foreground">
                  As of {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} (from localStorage)
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
              <CardDescription>Create, view, and delete school-wide announcements. (Uses LocalStorage)</CardDescription>
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
               <div className="flex items-center justify-center py-4">
                 <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                 <p className="text-muted-foreground">Loading announcements...</p>
               </div>
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
            <CardTitle className="flex items-center"><ListChecks /> Quick Actions</CardTitle>
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
                <CardTitle className="flex items-center"><Wrench /> System Health</CardTitle>
                <CardDescription>
                    Client-side system checks. {lastHealthCheck && <span className="block text-xs mt-1">Last checked: {lastHealthCheck}</span>}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-md bg-secondary/30">
                    <div className="flex items-center">
                        {onlineStatus ? <Wifi className="text-green-500"/> : <WifiOff className="text-destructive"/>}
                        <span className="text-sm font-medium ml-2">Internet Connectivity</span>
                    </div>
                    {onlineStatus 
                        ? <span className="text-sm font-semibold text-green-600 flex items-center"><CheckCircle2/>Online</span> 
                        : <span className="text-sm font-semibold text-destructive flex items-center"><AlertCircle/>Offline</span>}
                </div>
                <div className="flex items-center justify-between p-3 rounded-md bg-secondary/30">
                     <div className="flex items-center">
                        <HardDrive className="text-blue-500"/>
                        <span className="text-sm font-medium ml-2">Browser Storage</span>
                    </div>
                    {localStorageStatus === "Operational" && <span className="text-sm font-semibold text-green-600 flex items-center"><CheckCircle2/>{localStorageStatus}</span>}
                    {localStorageStatus === "Checking..." && <span className="text-sm font-semibold text-muted-foreground">{localStorageStatus}</span>}
                    {(localStorageStatus === "Error" || localStorageStatus === "Disabled/Error") && <span className="text-sm font-semibold text-destructive flex items-center"><AlertCircle/>{localStorageStatus}</span>}
                </div>
                <p className="text-xs text-muted-foreground pt-2">Note: These are client-side checks.</p>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
