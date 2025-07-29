
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
import { Users, DollarSign, PlusCircle, Megaphone, Trash2, Send, Target, UserPlus, Banknote, ListChecks, Wrench, Wifi, WifiOff, CheckCircle2, AlertCircle, HardDrive, Loader2, ShieldAlert, RefreshCw } from "lucide-react";
import { ANNOUNCEMENT_TARGETS } from "@/lib/constants"; 
import { formatDistanceToNow, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { getSupabase } from "@/lib/supabaseClient";
import type { User, PostgrestError } from "@supabase/supabase-js";
import { sendAnnouncementEmail } from "@/lib/email";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

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

interface QuickActionItem {
  title: string;
  href: string;
  icon: React.ElementType;
  description: string;
}

export default function AdminDashboardPage() {
  const { toast } = useToast();
  const supabase = getSupabase();
  const isMounted = useRef(true);
  const { setHasNewResultsForApproval, setHasNewBehaviorLog } = useAuth();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [dashboardStats, setDashboardStats] = useState({
    totalStudents: "0",
    totalTeachers: "0",
    feesCollected: "GHS 0.00",
  });
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

  const [onlineStatus, setOnlineStatus] = useState(true);
  const [localStorageStatus, setLocalStorageStatus] = useState<"Operational" | "Error" | "Disabled/Error" | "Checking...">("Checking...");
  const [lastHealthCheck, setLastHealthCheck] = useState<string | null>(null);

  const checkPendingResults = useCallback(async () => {
    if (typeof window === 'undefined') return;
    try {
        const {data, error} = await supabase
            .from('academic_results')
            .select('created_at')
            .eq('approval_status', 'pending')
            .order('created_at', {ascending: false})
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
            const lastCheckedTimestamp = localStorage.getItem('admin_last_checked_pending_result');
            if (!lastCheckedTimestamp || new Date(data.created_at) > new Date(lastCheckedTimestamp)) {
                setHasNewResultsForApproval(true);
            } else {
                setHasNewResultsForApproval(false);
            }
        } else {
            setHasNewResultsForApproval(false);
        }
    } catch (e) {
        console.warn("Could not check for new pending results:", e);
    }
  }, [supabase, setHasNewResultsForApproval]);

  const checkNewBehaviorLogs = useCallback(async () => {
    if (typeof window === 'undefined') return;
    try {
        const { data, error } = await supabase
            .from('behavior_incidents')
            .select('created_at')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        
        if (data) {
            const lastCheckedTimestamp = localStorage.getItem('admin_last_checked_behavior_log');
            if (!lastCheckedTimestamp || new Date(data.created_at) > new Date(lastCheckedTimestamp)) {
                setHasNewBehaviorLog(true);
            } else {
                setHasNewBehaviorLog(false);
            }
        } else {
            setHasNewBehaviorLog(false);
        }
    } catch (e) {
        console.warn("Could not check for new behavior logs:", e);
    }
  }, [supabase, setHasNewBehaviorLog]);

  const loadAllData = useCallback(async () => {
    if (!isMounted.current) return;
    setIsLoading(true);

    try {
        // Fetch Settings and Academic Year
        const { data: appSettings } = await supabase.from('app_settings').select('current_academic_year').eq('id', 1).single();
        const year = appSettings?.current_academic_year || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
        if (isMounted.current) setCurrentSystemAcademicYear(year);
        
        // Fetch All Data in Parallel
        const [
            { count: studentCount },
            { count: teacherCount },
            { data: paymentsData, error: paymentsError },
            { data: announcementData, error: announcementError },
            { data: incidentData, error: incidentError }
        ] = await Promise.all([
            supabase.from('students').select('*', { count: 'exact', head: true }),
            supabase.from('teachers').select('*', { count: 'exact', head: true }),
            supabase.from('fee_payments').select('amount_paid').gte('payment_date', `${year.split('-')[0]}-08-01`).lte('payment_date', `${year.split('-')[1]}-07-31`),
            supabase.from('school_announcements').select('*').order('created_at', { ascending: false }).limit(3),
            supabase.from('behavior_incidents').select('*').order('created_at', { ascending: false }).limit(5)
        ]);

        if(paymentsError) throw paymentsError;
        if(announcementError) throw announcementError;
        if(incidentError) throw incidentError;

        if (isMounted.current) {
            // Process Stats
            const totalFeesForYear = (paymentsData || []).reduce((sum, payment) => sum + (payment.amount_paid || 0), 0);
            setDashboardStats({
                totalStudents: studentCount?.toString() || "0",
                totalTeachers: teacherCount?.toString() || "0",
                feesCollected: `GHS ${totalFeesForYear.toFixed(2)}`
            });
            setIsLoadingAnnouncements(false);
            setAnnouncements(announcementData || []);
            setAnnouncementsError(null);
            setIsLoadingIncidents(false);
            setRecentBehaviorIncidents(incidentData || []);
            setIncidentsError(null);
        }

    } catch (dbError: any) {
        console.error("Error loading dashboard data:", dbError.message);
        if (isMounted.current) {
            setDashboardStats({ totalStudents: "Error", totalTeachers: "Error", feesCollected: "GHS Error" });
            setAnnouncementsError("Failed to load announcements.");
            setIncidentsError("Failed to load recent incidents.");
        }
    } finally {
        if (isMounted.current) setIsLoading(false);
    }
  }, [supabase]);

  // Effect for initial user and other data fetches
  useEffect(() => {
    isMounted.current = true;
    
    async function checkUserAndFetchInitialData() {
        if (!isMounted.current) return;
        
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted.current) {
            if (session?.user) {
                setCurrentUser(session.user);
                loadAllData();
                checkPendingResults();
                checkNewBehaviorLogs();
            } else {
               setIsLoading(false);
               setAnnouncementsError("Admin login required to manage announcements.");
               setIncidentsError("Admin login required to view incidents.");
            }
        }
    }

    checkUserAndFetchInitialData();

    // Browser-specific checks
    if (typeof window !== 'undefined') {
        setOnlineStatus(navigator.onLine);
        try { localStorage.setItem('__sjm_health_check__', 'ok'); localStorage.removeItem('__sjm_health_check__'); if (isMounted.current) setLocalStorageStatus("Operational"); } catch (e) { if (isMounted.current) setLocalStorageStatus("Disabled/Error"); }
        if (isMounted.current) setLastHealthCheck(new Date().toLocaleTimeString());
        
        const handleOnline = () => { if (isMounted.current) setOnlineStatus(true); };
        const handleOffline = () => { if (isMounted.current) setOnlineStatus(false); };
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }
    
    return () => { isMounted.current = false; };
  }, [supabase, loadAllData, checkPendingResults, checkNewBehaviorLogs]);

  useEffect(() => {
    if (!isAnnouncementDialogOpen) {
      setNewAnnouncement({ title: "", message: "", target_audience: "All" });
    }
  }, [isAnnouncementDialogOpen]);

  const handleSaveAnnouncement = async () => {
    if (!currentUser) {
      toast({ title: "Authentication Error", description: "You must be logged in as admin to post announcements.", variant: "destructive" });
      return;
    }
    if (!newAnnouncement.title.trim() || !newAnnouncement.message.trim()) {
      toast({ title: "Error", description: "Title and message are required.", variant: "destructive" });
      return;
    }

    const announcementToSave = {
      title: newAnnouncement.title,
      message: newAnnouncement.message,
      target_audience: newAnnouncement.target_audience,
      author_id: currentUser.id,
      author_name: currentUser.user_metadata?.full_name || currentUser.email || "Admin",
    };

    try {
      const { data: savedAnnouncement, error: insertError } = await supabase
        .from('school_announcements')
        .insert([announcementToSave])
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      if (isMounted.current && savedAnnouncement) {
        setAnnouncements(prev => [savedAnnouncement, ...prev].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        
        // --- Email Notification Logic ---
        sendAnnouncementEmail(
            { title: savedAnnouncement.title, message: savedAnnouncement.message },
            savedAnnouncement.target_audience
        ).then(emailResult => {
            if (emailResult.success) {
                toast({ title: "Email Notifications Sent", description: emailResult.message });
            } else {
                toast({ title: "Email Sending Failed", description: emailResult.message, variant: "destructive" });
            }
        });
      }
      toast({ title: "Success", description: "Announcement posted successfully." });
      setIsAnnouncementDialogOpen(false);
    } catch (e: any) {
      console.error("Error saving announcement. Details:", e);
      toast({ 
        title: "Database Error", 
        description: `Could not post announcement. ${e.message}`, 
        variant: "destructive",
        duration: 8000 
      });
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
     if (!currentUser) {
      toast({ title: "Authentication Error", description: "You must be logged in as admin.", variant: "destructive" });
      return;
    }
    try {
      const { error: deleteError } = await supabase
        .from('school_announcements')
        .delete()
        .eq('id', id);
      if (deleteError) throw deleteError;
      if (isMounted.current) setAnnouncements(prev => prev.filter(ann => ann.id !== id));
      toast({ title: "Success", description: "Announcement deleted." });
    } catch (e: any) {
      console.error("Error deleting announcement:", e);
      toast({ title: "Database Error", description: `Could not delete announcement: ${e.message}`, variant: "destructive" });
    }
  };

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

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-3xl font-headline font-semibold text-primary">Admin Overview</h2>
            <Button variant="outline" onClick={loadAllData} disabled={isLoading}>
                <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />Refresh Dashboard
            </Button>
        </div>
      
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
                <div>
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  ) : (
                    <div className={`text-2xl font-bold ${dashboardStats[stat.valueKey as keyof typeof dashboardStats].toString().includes("Error") ? "text-destructive" : "text-primary"}`}>
                      {dashboardStats[stat.valueKey as keyof typeof dashboardStats]}
                    </div>
                  )}
                  {stat.title === "Fees Collected (This Year)" && (
                    <p className="text-xs text-muted-foreground">
                      For academic year: {currentSystemAcademicYear}
                    </p>
                  )}
                </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
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
                <Button size="default" disabled={!currentUser}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Create New
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
                    <Select value={newAnnouncement.target_audience} onValueChange={(value: "All" | "Students" | "Teachers") => setNewAnnouncement(prev => ({ ...prev, target_audience: value }))}>
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
                  <Button onClick={handleSaveAnnouncement} disabled={!currentUser}><Send className="mr-2 h-4 w-4" /> Post Announcement</Button>
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
            ) : announcementsError ? (
              <p className="text-destructive text-center py-4">{announcementsError}</p>
            ) : announcements.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No announcements posted yet.</p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {announcements.map(ann => ( 
                  <Card key={ann.id} className="bg-secondary/30">
                    <CardHeader className="pb-2 pt-3 px-4">
                      <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-base">{ann.title}</CardTitle>
                            <CardDescription className="text-xs">
                                For: {ann.target_audience} | By: {ann.author_name || "Admin"} | {formatDistanceToNow(new Date(ann.created_at), { addSuffix: true })}
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteAnnouncement(ann.id)} className="text-destructive hover:text-destructive/80 h-7 w-7" disabled={!currentUser}>
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

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-primary flex items-center">
              <ShieldAlert className="mr-3 h-6 w-6" /> Recent Behavior Incidents
            </CardTitle>
            <CardDescription>Latest student behavior incidents logged by teachers.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingIncidents ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                <p className="text-muted-foreground">Loading incidents...</p>
              </div>
            ) : incidentsError ? (
              <p className="text-destructive text-center py-4">{incidentsError}</p>
            ) : recentBehaviorIncidents.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No behavior incidents logged recently.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {recentBehaviorIncidents.map(incident => (
                  <Card key={incident.id} className="bg-secondary/30">
                    <CardHeader className="pb-2 pt-3 px-4">
                      <CardTitle className="text-base">{incident.type} - {incident.student_name}</CardTitle>
                      <CardDescription className="text-xs break-words">
                        Class: {incident.class_id} | By: {incident.teacher_name} | On: {format(new Date(incident.date + "T00:00:00"), "PPP")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                      <p className="text-sm whitespace-pre-wrap line-clamp-2">{incident.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {recentBehaviorIncidents.length > 0 && (
                 <div className="mt-4 text-center">
                    <Button variant="link" size="sm" asChild>
                       <Link href="/admin/behavior-logs">View All Behavior Logs</Link>
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
                        <span className="text-sm font-medium ml-2">Browser Storage (Legacy/Misc)</span>
                    </div>
                    {localStorageStatus === "Operational" && <span className="text-sm font-semibold text-green-600 flex items-center"><CheckCircle2/>{localStorageStatus}</span>}
                    {localStorageStatus === "Checking..." && <span className="text-sm font-semibold text-muted-foreground">{localStorageStatus}</span>}
                    {(localStorageStatus === "Error" || localStorageStatus === "Disabled/Error") && <span className="text-sm font-semibold text-destructive flex items-center"><AlertCircle/>{localStorageStatus}</span>}
                </div>
                <p className="text-xs text-muted-foreground pt-2">Note: Payments now in the database. Other non-critical data might still use browser storage.</p>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
