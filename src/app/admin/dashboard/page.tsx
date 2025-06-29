
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
import { ANNOUNCEMENT_TARGETS, TERMS_ORDER } from "@/lib/constants"; 
import { formatDistanceToNow, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { getSupabase } from "@/lib/supabaseClient";
import type { User, PostgrestError } from "@supabase/supabase-js";
import { sendAnnouncementEmail } from "@/lib/email";

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
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [dashboardStats, setDashboardStats] = useState({
    totalStudents: "0",
    totalTeachers: "0",
    feesCollected: "GHS 0.00",
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [currentSystemAcademicYear, setCurrentSystemAcademicYear] = useState<string>("");
  const [feeFilter, setFeeFilter] = useState<'term1' | 'term2' | 'term3'>('term1');

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

  const fetchDashboardStats = useCallback(async (filter: typeof feeFilter, academicYear: string) => {
    if (!isMounted.current) return;
    setIsLoadingStats(true);
    
    let studentCountStr = "0", teacherCountStr = "0", feesCollectedStr = "GHS 0.00";

    try {
      const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true });
      studentCountStr = studentCount?.toString() || "0";

      const { count: teacherCount } = await supabase.from('teachers').select('*', { count: 'exact', head: true });
      teacherCountStr = teacherCount?.toString() || "0";

      let startDate, endDate;

      if (academicYear) {
        const startYear = parseInt(academicYear.split('-')[0]);
        const termIndex = parseInt(filter.replace('term', '')) - 1;
        
        if (termIndex === 0) { // Term 1: Aug - Dec
            startDate = `${startYear}-08-01`;
            endDate = `${startYear}-12-31`;
        } else if (termIndex === 1) { // Term 2: Jan - Apr
            startDate = `${startYear + 1}-01-01`;
            endDate = `${startYear + 1}-04-30`;
        } else if (termIndex === 2) { // Term 3: May - Jul
            startDate = `${startYear + 1}-05-01`;
            endDate = `${startYear + 1}-07-31`;
        }
      }
      
      if (startDate && endDate) {
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('fee_payments')
          .select('amount_paid')
          .gte('payment_date', startDate)
          .lte('payment_date', endDate);
        
        if (paymentsError) {
          throw paymentsError;
        }
        
        const monthlyTotal = paymentsData.reduce((sum, payment) => sum + (payment.amount_paid || 0), 0);
        feesCollectedStr = `GHS ${monthlyTotal.toFixed(2)}`;
      }
    } catch (dbError: any) {
      console.error("Error fetching dashboard stats:", dbError.message);
      if (studentCountStr === "0") studentCountStr = "Error";
      if (teacherCountStr === "0") teacherCountStr = "Error";
      if (feesCollectedStr === "GHS 0.00") feesCollectedStr = "GHS Error";
    }

    if (isMounted.current) {
      setDashboardStats({ totalStudents: studentCountStr, totalTeachers: teacherCountStr, feesCollected: feesCollectedStr });
      setIsLoadingStats(false);
    }
  }, [supabase]);

  const fetchAnnouncementsFromSupabase = useCallback(async () => {
    if (!isMounted.current) return;
    setIsLoadingAnnouncements(true);
    setAnnouncementsError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('school_announcements')
        .select('*')
        .order('created_at', { ascending: false });
      if (fetchError) throw fetchError;
      if (isMounted.current) setAnnouncements(data || []);
    } catch (e: any) {
      console.error("Error fetching announcements:", e);
      if (isMounted.current) setAnnouncementsError(`Failed to load announcements: ${e.message}`);
    } finally {
      if (isMounted.current) setIsLoadingAnnouncements(false);
    }
  }, [supabase]);

  const fetchRecentIncidents = useCallback(async () => {
    if (!isMounted.current) return;
    setIsLoadingIncidents(true);
    setIncidentsError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('behavior_incidents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (fetchError) throw fetchError;
      if (isMounted.current) setRecentBehaviorIncidents(data || []);
    } catch (e: any) {
      console.error("Error fetching recent behavior incidents:", e);
      if (isMounted.current) setIncidentsError(`Failed to load incidents: ${e.message}`);
    } finally {
      if (isMounted.current) setIsLoadingIncidents(false);
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
                fetchAnnouncementsFromSupabase();
                fetchRecentIncidents();
            } else {
               setIsLoadingStats(false); setIsLoadingAnnouncements(false); setIsLoadingIncidents(false);
               setAnnouncementsError("Admin login required to manage announcements.");
               setIncidentsError("Admin login required to view incidents.");
            }
        }
    }
    
    async function fetchAppSettings() {
        if (!isMounted.current) return;
        const { data } = await supabase.from('app_settings').select('current_academic_year').eq('id', 1).single();
        if (isMounted.current) {
            const year = data?.current_academic_year || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
            setCurrentSystemAcademicYear(year);
        }
    }

    checkUserAndFetchInitialData();
    fetchAppSettings();

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
  }, [supabase, fetchAnnouncementsFromSupabase, fetchRecentIncidents]);

  // Effect to re-fetch stats when filter or academic year changes
  useEffect(() => {
    if (currentSystemAcademicYear) {
      fetchDashboardStats(feeFilter, currentSystemAcademicYear);
    }
  }, [feeFilter, currentSystemAcademicYear, fetchDashboardStats]);

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
        
        try {
            const { data: settings } = await supabase.from('app_settings').select('enable_email_notifications').eq('id', 1).single();
            
            if (settings?.enable_email_notifications) {
                let recipients: { email: string; full_name: string; }[] = [];

                if (savedAnnouncement.target_audience === 'All' || savedAnnouncement.target_audience === 'Students') {
                    const { data: students, error: studentError } = await supabase.from('students').select('contact_email, full_name, notification_preferences');
                    if (studentError) throw new Error(`Could not fetch student emails: ${studentError.message}`);
                    
                    const optedInStudents = (students || []).filter(s => s.contact_email && s.notification_preferences?.enableSchoolAnnouncementEmails !== false);
                    recipients.push(...optedInStudents.map(s => ({ email: s.contact_email!, full_name: s.full_name })));
                }

                if (savedAnnouncement.target_audience === 'All' || savedAnnouncement.target_audience === 'Teachers') {
                    const { data: teachers, error: teacherError } = await supabase.from('teachers').select('email, full_name');
                    if (teacherError) throw new Error(`Could not fetch teacher emails: ${teacherError.message}`);
                    recipients.push(...(teachers || []).filter(t => t.email).map(t => ({ email: t.email!, full_name: t.full_name })));
                }
                
                const uniqueRecipients = Array.from(new Map(recipients.map(item => [item['email'], item])).values());
                
                if (uniqueRecipients.length > 0) {
                   await sendAnnouncementEmail(savedAnnouncement, uniqueRecipients);
                }

                toast({ title: "Email Notifications Sent", description: `Announcement sent to ${uniqueRecipients.length} recipients.`});
            }
        } catch (emailError: any) {
             console.error("Error sending announcement email notifications:", emailError);
             toast({
                title: "Email Notification Failed",
                description: `Announcement posted, but failed to send email notifications: ${emailError.message}`,
                variant: "destructive"
             });
        }
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
    { title: "Fees Collected", valueKey: "feesCollected", icon: DollarSign, color: "text-yellow-500" },
  ];

  const quickActionItems: QuickActionItem[] = [
    { title: "Register Student", href: "/admin/register-student", icon: UserPlus, description: "Add a new student." },
    { title: "Record Payment", href: "/admin/record-payment", icon: Banknote, description: "Log a new fee payment." },
    { title: "Manage Fees", href: "/admin/fees", icon: DollarSign, description: "Configure fee structure." },
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
              {stat.title === "Fees Collected" ? (
                <Select value={feeFilter} onValueChange={(value) => setFeeFilter(value as any)}>
                    <SelectTrigger className="w-[130px] h-8 text-xs -my-1">
                        <SelectValue placeholder="Filter..." />
                    </SelectTrigger>
                    <SelectContent>
                        {TERMS_ORDER.map((term, i) => (
                            <SelectItem key={term} value={`term${i + 1}`}>{term}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              ) : (
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  {isLoadingStats ? (
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  ) : (
                    <div className={`text-2xl font-bold ${dashboardStats[stat.valueKey as keyof typeof dashboardStats].toString().includes("Error") ? "text-destructive" : "text-primary"}`}>
                      {dashboardStats[stat.valueKey as keyof typeof dashboardStats]}
                    </div>
                  )}
                  {stat.title === "Fees Collected" && (
                    <p className="text-xs text-muted-foreground">
                      For academic year: {currentSystemAcademicYear}
                    </p>
                  )}
                </div>
                 {stat.title === "Fees Collected" && (
                  <Button variant="ghost" size="icon" onClick={() => fetchDashboardStats(feeFilter, currentSystemAcademicYear)} disabled={isLoadingStats} aria-label="Refresh stats">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
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
                {announcements.slice(0, 3).map(ann => ( 
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
                      <CardDescription className="text-xs">
                        Class: {incident.class_id} | Reported by: {incident.teacher_name} | Date: {format(new Date(incident.date + "T00:00:00"), "PPP")}
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
