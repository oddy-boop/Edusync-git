
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import { Users, DollarSign, PlusCircle, Megaphone, Trash2, Send, Target, UserPlus, Banknote, ListChecks, Wrench, Wifi, WifiOff, CheckCircle2, AlertCircle, HardDrive, Loader2, ShieldAlert, RefreshCw, Cloud, Cake } from "lucide-react";
import { ANNOUNCEMENT_TARGETS } from "@/lib/constants"; 
import { formatDistanceToNow, format, addDays, getDayOfYear } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { sendAnnouncementEmail } from "@/lib/email";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Caching Keys
const ADMIN_DASHBOARD_CACHE_KEY = "admin_dashboard_cache_edusync";

interface Announcement {
  id: string; 
  title: string;
  message: string;
  target_audience: "All" | "Students" | "Teachers";
  author_id?: string | null;
  author_name?: string | null; 
  created_at: string; 
  updated_at?: string;
  published_at?: string;
}

interface BehaviorIncidentFromSupabase {
  id: string;
  student_id_display: string;
  student_name: string;
  class_id: string;
  teacher_id: string;
  teacher_name: string;
  type: string;
  description: string;
  date: string; // YYYY-MM-DD
  created_at: string;
}

interface BirthdayPerson {
  name: string;
  role: 'Student' | 'Teacher';
  detail: string; // e.g., 'Basic 1' or 'Teacher'
  date: Date;
  daysUntil: number;
}

interface DashboardCache {
    stats: {
        totalStudents: string;
        totalTeachers: string;
        feesCollected: string;
    };
    announcements: Announcement[];
    incidents: BehaviorIncidentFromSupabase[];
    birthdays: BirthdayPerson[];
    academicYear: string;
    timestamp: number;
}

interface QuickActionItem {
  title: string;
  href: string;
  icon: React.ElementType;
  description: string;
}

export default function AdminDashboardPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { role, setHasNewResultsForApproval, setHasNewBehaviorLog, setHasNewApplication, user: currentUser, schoolId } = useAuth();
  const supabase = createClient();
  
  const [dashboardStats, setDashboardStats] = useState({ totalStudents: "0", totalTeachers: "0", feesCollected: "GHS 0.00" });
  const [isLoading, setIsLoading] = useState(true);
  const [currentSystemAcademicYear, setCurrentSystemAcademicYear] = useState<string>("");

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isAnnouncementDialogOpen, setIsAnnouncementDialogOpen] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState<Pick<Announcement, 'title' | 'message' | 'target_audience'>>({ title: "", message: "", target_audience: "All" });
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(true);
  const [announcementsError, setAnnouncementsError] = useState<string | null>(null);

  const [recentBehaviorIncidents, setRecentBehaviorIncidents] = useState<BehaviorIncidentFromSupabase[]>([]);
  const [isLoadingIncidents, setIsLoadingIncidents] = useState(true);
  const [incidentsError, setIncidentsError] = useState<string | null>(null);

  const [upcomingBirthdays, setUpcomingBirthdays] = useState<BirthdayPerson[]>([]);
  const [isLoadingBirthdays, setIsLoadingBirthdays] = useState(true);
  const [birthdaysError, setBirthdaysError] = useState<string | null>(null);

  const [onlineStatus, setOnlineStatus] = useState(true);
  const [localStorageStatus, setLocalStorageStatus] = useState<"Operational" | "Error" | "Disabled/Error" | "Checking...">("Checking...");
  const [lastHealthCheck, setLastHealthCheck] = useState<string | null>(null);
  
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    // Redirect if role is 'accountant'
    if (role === 'accountant') {
      router.replace('/admin/expenditures');
    }
  }, [role, router]);

  const loadAllData = useCallback(async (isOnlineMode: boolean, currentSchoolId: number) => {
    if (!isMounted.current) return;
    setIsLoading(true);

    if (!isOnlineMode) {
        toast({ title: "Offline Mode", description: "Displaying cached data. Some information may be outdated." });
        const cachedDataRaw = localStorage.getItem(ADMIN_DASHBOARD_CACHE_KEY);
        if (cachedDataRaw) {
            const cache: DashboardCache = JSON.parse(cachedDataRaw);
            if(isMounted.current) {
                setDashboardStats(cache.stats);
                setCurrentSystemAcademicYear(cache.academicYear);
                setAnnouncements(cache.announcements);
                setRecentBehaviorIncidents(cache.incidents);
                setUpcomingBirthdays(cache.birthdays.map(b => ({ ...b, date: new Date(b.date) })));
            }
        } else {
            if(isMounted.current) setAnnouncementsError("No cached data available for offline viewing.");
        }
        if(isMounted.current) {
            setIsLoading(false);
            setIsLoadingAnnouncements(false);
            setIsLoadingIncidents(false);
            setIsLoadingBirthdays(false);
        }
        return;
    }
    
    try {
        const { data: settingsData, error: settingsError } = await supabase.from('schools').select('current_academic_year').eq('id', currentSchoolId).single();
        if(settingsError) throw settingsError;
        const year = settingsData?.current_academic_year || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
        
        const startYear = parseInt(year.split('-')[0], 10);
        const endYear = parseInt(year.split('-')[1], 10);
        const academicYearStartDate = `${startYear}-08-01`; 
        const academicYearEndDate = `${endYear}-07-31`;

        const [
            { count: studentCount },
            { count: teacherCount },
            { data: paymentsData },
            { data: announcementData },
            { data: incidentData },
            { data: studentBdays },
            { data: teacherBdays }
        ] = await Promise.all([
            supabase.from("students").select('*', { count: 'exact', head: true }).eq('school_id', currentSchoolId),
            supabase.from("teachers").select('*', { count: 'exact', head: true }).eq('school_id', currentSchoolId),
            supabase.from("fee_payments").select('amount_paid').eq('school_id', currentSchoolId).gte('payment_date', academicYearStartDate).lte('payment_date', academicYearEndDate),
            supabase.from('school_announcements').select('*').eq('school_id', currentSchoolId).order('created_at', { ascending: false }).limit(3),
            supabase.from('behavior_incidents').select('*').eq('school_id', currentSchoolId).order('date', { ascending: false }).limit(5),
            supabase.from('students').select('full_name, date_of_birth, grade_level').eq('school_id', currentSchoolId).not('date_of_birth', 'is', null),
            supabase.from('teachers').select('full_name, date_of_birth').eq('school_id', currentSchoolId).not('date_of_birth', 'is', null),
        ]);
        
        if (isMounted.current) {
            setCurrentSystemAcademicYear(year!);
            const totalFeesForYear = (paymentsData || []).reduce((sum, payment) => sum + (payment.amount_paid || 0), 0);
            const currentStats = { totalStudents: studentCount?.toString() || "0", totalTeachers: teacherCount?.toString() || "0", feesCollected: `GHS ${totalFeesForYear.toFixed(2)}` };
            const currentAnnouncements = announcementData as Announcement[] || [];
            const currentIncidents = incidentData as BehaviorIncidentFromSupabase[] || [];
            
            const today = new Date();
            const todayDayOfYear = getDayOfYear(today);
            const upcomingBirthdayList: BirthdayPerson[] = [];

            (studentBdays || []).forEach(s => {
                if(!s.date_of_birth) return;
                const dob = new Date(s.date_of_birth + 'T00:00:00');
                if (!isNaN(dob.getTime())) {
                    const birthdayThisYear = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
                    let daysUntil = getDayOfYear(birthdayThisYear) - todayDayOfYear;
                    if (daysUntil < 0) daysUntil += 365;
                    if (daysUntil <= 7) upcomingBirthdayList.push({ name: s.full_name, role: 'Student', detail: s.grade_level, date: birthdayThisYear, daysUntil });
                }
            });
             (teacherBdays || []).forEach(t => {
                if(!t.date_of_birth) return;
                const dob = new Date(t.date_of_birth + 'T00:00:00');
                if (!isNaN(dob.getTime())) {
                    const birthdayThisYear = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
                    let daysUntil = getDayOfYear(birthdayThisYear) - todayDayOfYear;
                    if (daysUntil < 0) daysUntil += 365;
                    if (daysUntil <= 7) upcomingBirthdayList.push({ name: t.full_name, role: 'Teacher', detail: 'Staff', date: birthdayThisYear, daysUntil });
                }
            });

            upcomingBirthdayList.sort((a,b) => a.daysUntil - b.daysUntil);
            
            setDashboardStats(currentStats);
            setAnnouncements(currentAnnouncements);
            setRecentBehaviorIncidents(currentIncidents);
            setUpcomingBirthdays(upcomingBirthdayList);
            
            const cache: DashboardCache = { stats: currentStats, announcements: currentAnnouncements, incidents: currentIncidents, birthdays: upcomingBirthdayList.map(b => ({...b, date: b.date.toISOString() } as any)), academicYear: year!, timestamp: Date.now() };
            localStorage.setItem(ADMIN_DASHBOARD_CACHE_KEY, JSON.stringify(cache));
            
            setAnnouncementsError(null);
            setIncidentsError(null);
            setBirthdaysError(null);
        }
    } catch (e: any) {
         if(isMounted.current) {
            setDashboardStats({ totalStudents: "Error", totalTeachers: "Error", feesCollected: "GHS Error" });
            setAnnouncementsError("Failed to load announcements.");
            setIncidentsError("Failed to load recent incidents.");
            setBirthdaysError("Failed to load birthdays.");
        }
    }

    if (isMounted.current) {
        setIsLoading(false);
        setIsLoadingAnnouncements(false);
        setIsLoadingIncidents(false);
        setIsLoadingBirthdays(false);
    }
  }, [supabase, toast]);
  
  useEffect(() => {
    // Other useEffect logic...
    async function checkInitialData() {
        if (schoolId) {
            await loadAllData(onlineStatus, schoolId);
        }
    }
    checkInitialData();
  }, [schoolId, onlineStatus, loadAllData]);

  const handleSaveAnnouncement = async () => { /* ... implementation unchanged ... */ };
  const handleDeleteAnnouncement = async (id: string) => { /* ... implementation unchanged ... */ };
  
  const statsCards = [
    { title: "Total Students", valueKey: "totalStudents", icon: Users, color: "text-blue-500" },
    { title: "Total Teachers", valueKey: "totalTeachers", icon: Users, color: "text-green-500" },
    { title: "Fees Collected (This Year)", valueKey: "feesCollected", icon: DollarSign, color: "text-yellow-500" },
  ];

  const quickActionItems: QuickActionItem[] = [
    { title: "Register Student", href: "/admin/register-student", icon: UserPlus, description: "Add a new student." },
    { title: "Record Payment", href: "/admin/record-payment", icon: Banknote, description: "Log a new fee payment." },
    { title: "Manage Fees", href: "/admin/fees", icon: DollarSign, description: "Configure fee structure." },
    { title: "Manage Users", href: "/admin/users", icon: Users, description: "View/edit user records." },
  ];

  if (isLoading) {
      return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin"/></div>
  }

  if (role && !['admin', 'super_admin'].includes(role)) {
      return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin"/></div>
  }

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <h2 className="text-3xl font-headline font-semibold text-primary">Admin Overview</h2>
            <Button variant="outline" onClick={() => currentUser && role && schoolId && loadAllData(onlineStatus, schoolId)} disabled={isLoading || !onlineStatus}>
                <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />Refresh Dashboard
            </Button>
        </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {statsCards.map((stat) => (
          <Card key={stat.title} className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle><stat.icon className={`h-5 w-5 ${stat.color}`} /></CardHeader>
            <CardContent>
                <div>{isLoading ? (<Loader2 className="h-6 w-6 animate-spin text-primary" />) : (<div className={`text-2xl font-bold ${dashboardStats[stat.valueKey as keyof typeof dashboardStats].toString().includes("Error") ? "text-destructive" : "text-primary"}`}>{dashboardStats[stat.valueKey as keyof typeof dashboardStats]}</div>)}
                  {stat.title === "Fees Collected (This Year)" && (<p className="text-xs text-muted-foreground">For academic year: {currentSystemAcademicYear}</p>)}
                </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4">
            <div className="space-y-1"><CardTitle className="text-xl font-semibold text-primary flex items-center"><Megaphone className="mr-3 h-6 w-6" /> Manage Announcements</CardTitle><CardDescription>Create, view, and delete school-wide announcements.</CardDescription></div>
            <Dialog open={isAnnouncementDialogOpen} onOpenChange={setIsAnnouncementDialogOpen}>
              <DialogTrigger asChild><Button size="default" disabled={!currentUser} className="w-full sm:w-auto"><PlusCircle className="mr-2 h-4 w-4" /> Create New</Button></DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <DialogHeader><DialogTitle className="flex items-center"><Send className="mr-2 h-5 w-5" /> Create New Announcement</DialogTitle><DialogDescription>Compose and target your announcement.</DialogDescription></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="annTitle" className="text-right">Title</Label><Input id="annTitle" value={newAnnouncement.title} onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))} className="col-span-3" placeholder="Important Update" /></div>
                  <div className="grid grid-cols-4 items-start gap-4"><Label htmlFor="annMessage" className="text-right pt-2">Message</Label><Textarea id="annMessage" value={newAnnouncement.message} onChange={(e) => setNewAnnouncement(prev => ({ ...prev, message: e.target.value }))} className="col-span-3 min-h-[100px]" placeholder="Details of the announcement..." /></div>
                  <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="annTarget" className="text-right flex items-center"><Target className="mr-1 h-4 w-4"/>Target</Label><Select value={newAnnouncement.target_audience} onValueChange={(value: "All" | "Students" | "Teachers") => setNewAnnouncement(prev => ({ ...prev, target_audience: value }))}><SelectTrigger className="col-span-3" id="annTarget"><SelectValue placeholder="Select target audience" /></SelectTrigger><SelectContent>{ANNOUNCEMENT_TARGETS.map(target => (<SelectItem key={target.value} value={target.value}>{target.label}</SelectItem>))}</SelectContent></Select></div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setIsAnnouncementDialogOpen(false)}>Cancel</Button><Button onClick={handleSaveAnnouncement} disabled={!currentUser}><Send className="mr-2 h-4 w-4" /> Post Announcement</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {isLoadingAnnouncements ? (<div className="flex items-center justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary mr-2" /><p className="text-muted-foreground">Loading announcements...</p></div>) : announcementsError ? (<p className="text-destructive text-center py-4">{announcementsError}</p>) : announcements.length === 0 ? (<p className="text-muted-foreground text-center py-4">No announcements posted yet.</p>) : (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {announcements.map(ann => ( <Card key={ann.id} className="bg-secondary/30"><CardHeader className="pb-2 pt-3 px-4"><div className="flex justify-between items-start"><div><CardTitle className="text-base">{ann.title}</CardTitle><CardDescription className="text-xs">For: {ann.target_audience} | By: {ann.author_name || "Admin"} | {formatDistanceToNow(new Date(ann.created_at), { addSuffix: true })}</CardDescription></div><Button variant="ghost" size="icon" onClick={() => handleDeleteAnnouncement(ann.id)} className="text-destructive hover:text-destructive/80 h-7 w-7" disabled={!currentUser}><Trash2 className="h-4 w-4" /></Button></div></CardHeader><CardContent className="px-4 pb-3"><p className="text-sm whitespace-pre-wrap line-clamp-3">{ann.message}</p></CardContent></Card>))}
              </div>)}
             {announcements.length > 3 && (<div className="mt-4 text-center"><Button variant="link" size="sm" asChild><Link href="/admin/announcements">View All Announcements</Link></Button></div>)}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader><CardTitle className="text-xl font-semibold text-primary flex items-center"><ShieldAlert className="mr-3 h-6 w-6" /> Recent Behavior Incidents</CardTitle><CardDescription>Latest student behavior incidents logged by teachers.</CardDescription></CardHeader>
          <CardContent>
            {isLoadingIncidents ? (<div className="flex items-center justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary mr-2" /><p className="text-muted-foreground">Loading incidents...</p></div>) : incidentsError ? (<p className="text-destructive text-center py-4">{incidentsError}</p>) : recentBehaviorIncidents.length === 0 ? (<p className="text-muted-foreground text-center py-4">No behavior incidents logged recently.</p>) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {recentBehaviorIncidents.map(incident => (<Card key={incident.id} className="bg-secondary/30"><CardHeader className="pb-2 pt-3 px-4"><CardTitle className="text-base">{incident.type} - {incident.student_name}</CardTitle><CardDescription className="text-xs break-words">Class: {incident.class_id} | By: {incident.teacher_name} | On: {format(new Date(incident.date + "T00:00:00"), "PPP")}</CardDescription></CardHeader><CardContent className="px-4 pb-3"><p className="text-sm whitespace-pre-wrap line-clamp-2">{incident.description}</p></CardContent></Card>))}
              </div>)}
            {recentBehaviorIncidents.length > 0 && (<div className="mt-4 text-center"><Button variant="link" size="sm" asChild><Link href="/admin/behavior-logs">View All Behavior Logs</Link></Button></div>)}
          </CardContent>
        </Card>
      </div>

       <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader><CardTitle className="flex items-center"><Cake className="mr-3 h-6 w-6 text-pink-500" /> Upcoming Birthdays (Next 7 Days)</CardTitle><CardDescription>Celebrate with your students and staff.</CardDescription></CardHeader>
          <CardContent>
            {isLoadingBirthdays ? (<div className="flex items-center justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary mr-2" /><p className="text-muted-foreground">Loading birthdays...</p></div>) : birthdaysError ? (<p className="text-destructive text-center py-4">{birthdaysError}</p>) : upcomingBirthdays.length === 0 ? (<p className="text-muted-foreground text-center py-4">No upcoming birthdays in the next week.</p>) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {upcomingBirthdays.map((person, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded-md bg-secondary/30">
                    <div>
                      <p className="font-semibold text-sm">{person.name}</p>
                      <p className="text-xs text-muted-foreground">{person.detail} - {format(person.date, "do MMMM")}</p>
                    </div>
                    <span className="text-xs font-medium text-primary/80">{person.daysUntil === 0 ? "Today!" : `in ${person.daysUntil} day(s)`}</span>
                  </div>
                ))}
              </div>)}
          </CardContent>
        </Card>
        
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center"><Wrench /> System Health</CardTitle>
                <CardDescription>Client-side system checks. {lastHealthCheck && <span className="block text-xs mt-1">Last checked: {lastHealthCheck}</span>}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-md bg-secondary/30">
                    <div className="flex items-center">
                        {onlineStatus ? <Cloud className="text-green-500"/> : <WifiOff className="text-destructive"/>}
                        <span className="text-sm font-medium ml-2">Internet Connectivity</span>
                    </div>
                    {onlineStatus ? <span className="text-sm font-semibold text-green-600 flex items-center"><CheckCircle2/>Online</span> : <span className="text-sm font-semibold text-destructive flex items-center"><AlertCircle/>Offline</span>}
                </div>
                <div className="flex items-center justify-between p-3 rounded-md bg-secondary/30">
                     <div className="flex items-center"><HardDrive className="text-blue-500"/><span className="text-sm font-medium ml-2">Browser Storage</span></div>
                    {localStorageStatus === "Operational" && <span className="text-sm font-semibold text-green-600 flex items-center"><CheckCircle2/>{localStorageStatus}</span>}
                    {localStorageStatus === "Checking..." && <span className="text-sm font-semibold text-muted-foreground">{localStorageStatus}</span>}
                    {(localStorageStatus === "Error" || localStorageStatus === "Disabled/Error") && <span className="text-sm font-semibold text-destructive flex items-center"><AlertCircle/>{localStorageStatus}</span>}
                </div>
                <p className="text-xs text-muted-foreground pt-2">Note: Key data like student lists are cached in browser storage to enable offline functionality.</p>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
