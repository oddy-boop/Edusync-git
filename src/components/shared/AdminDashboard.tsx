
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Users, DollarSign, Bell, ShieldAlert, AlertCircle, PlusCircle, Send, MessageSquare, Target, Calendar, Cake } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ANNOUNCEMENT_TARGETS } from "@/lib/constants";
import { createAnnouncementAction, fetchAnnouncementsAction } from "@/lib/actions/announcement.actions";
import { fetchIncidentsAction } from "@/lib/actions/behavior.actions";
import { getDashboardStatsAction } from '@/lib/actions/dashboard.actions';
import { getUpcomingBirthdaysAction } from '@/lib/actions/birthday.actions';

interface Announcement {
  id: string;
  title: string;
  message: string;
  target_audience: "All" | "Students" | "Teachers";
  author_name?: string | null;
  created_at: string;
}

interface BehaviorIncident {
  id: string;
  student_name: string;
  type: string;
  description: string;
  date: string;
}

interface DashboardStats {
  student_count: number;
  teacher_count: number;
  term_fees_collected: number;
}

interface UpcomingBirthday {
  id: string;
  full_name: string;
  date_of_birth: string;
  role: 'student' | 'teacher';
  days_until_birthday: number;
  grade_level?: string;
  contact_number?: string;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const { user, schoolId } = useAuth();
  const supabase = createClient();
  const isMounted = useRef(true);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [behaviorLogs, setBehaviorLogs] = useState<BehaviorIncident[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<UpcomingBirthday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isAnnouncementDialogOpen, setIsAnnouncementDialogOpen] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState<Pick<Announcement, 'title' | 'message' | 'target_audience'>>({ title: "", message: "", target_audience: "All" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatGhs = (v: unknown) => Number((v as any) ?? 0).toFixed(2);

  useEffect(() => {
    isMounted.current = true;
    const fetchData = async () => {
        if (!user || !schoolId) {
          if(isMounted.current) {
            setError("Admin user or school not identified.");
            setIsLoading(false);
          }
          return;
        }
        
        setIsLoading(true);
        
        try {
            const [statsResult, announcementsResult, incidentsResult, birthdaysResult] = await Promise.all([
                getDashboardStatsAction(),
                fetchAnnouncementsAction(),
                fetchIncidentsAction(),
                getUpcomingBirthdaysAction()
            ]);

            if(!isMounted.current) return;

            if (statsResult.success) {
                setStats(statsResult.data);
            } else {
                setError(prev => prev ? `${prev}\n${statsResult.message}` : statsResult.message);
            }

            if (announcementsResult.success) {
                setAnnouncements(announcementsResult.data);
            } else {
                 setError(prev => prev ? `${prev}\n${announcementsResult.message}` : announcementsResult.message);
            }
            
            if (incidentsResult.success) {
                setBehaviorLogs(incidentsResult.data);
            } else {
                setError(prev => prev ? `${prev}\n${incidentsResult.message}` : incidentsResult.message);
            }

            if (birthdaysResult.success) {
                setUpcomingBirthdays(birthdaysResult.data);
            } else {
                setError(prev => prev ? `${prev}\n${birthdaysResult.message}` : birthdaysResult.message);
            }

        } catch (e: any) {
            if(isMounted.current) setError(e.message || "An unknown error occurred while fetching dashboard data.");
        } finally {
            if(isMounted.current) setIsLoading(false);
        }
    };
    
    fetchData();

    return () => { isMounted.current = false; };
  }, [user, schoolId]);

  const handleSaveAnnouncement = async () => {
    if (!newAnnouncement.title.trim() || !newAnnouncement.message.trim()) {
      toast({ title: "Error", description: "Title and message are required.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const result = await createAnnouncementAction(newAnnouncement);
    if (result.success) {
      toast({ title: "Success", description: result.message });
      if(isMounted.current) {
        setAnnouncements(prev => [result.data, ...prev]);
        setIsAnnouncementDialogOpen(false);
        setNewAnnouncement({ title: "", message: "", target_audience: "All" });
      }
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
    if(isMounted.current) setIsSubmitting(false);
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (error) {
    return (
        <Card className="shadow-lg border-destructive bg-destructive/10">
            <CardHeader>
                <CardTitle className="text-destructive flex items-center"><AlertCircle/> Dashboard Error</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="whitespace-pre-wrap">{error}</p>
            </CardContent>
        </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats?.student_count ?? <Loader2 className="h-6 w-6 animate-spin"/>}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats?.teacher_count ?? <Loader2 className="h-6 w-6 animate-spin"/>}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fees Collected (This Academic Year)</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
    <CardContent><div className="text-2xl font-bold">GHS {typeof stats?.term_fees_collected !== 'undefined' && stats?.term_fees_collected !== null ? formatGhs(stats?.term_fees_collected) : <Loader2 className="h-6 w-6 animate-spin"/>}</div></CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
            <CardHeader className="flex flex-row justify-between items-start">
                <div>
                  <CardTitle className="flex items-center"><Bell className="mr-2 h-6 w-6"/> Recent Announcements</CardTitle>
                  <CardDescription>Latest 5 school-wide announcements.</CardDescription>
                </div>
                 <Dialog open={isAnnouncementDialogOpen} onOpenChange={setIsAnnouncementDialogOpen}>
                  <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> New</Button></DialogTrigger>
                  <DialogContent className="sm:max-w-[525px]">
                    <DialogHeader><DialogTitle className="flex items-center"><Send className="mr-2 h-5 w-5" /> Create New Announcement</DialogTitle><DialogDescription>Compose and target your announcement.</DialogDescription></DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2"><Label htmlFor="annTitle">Title</Label><Input id="annTitle" value={newAnnouncement.title} onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))} placeholder="Important Update" /></div>
                      <div className="space-y-2"><Label htmlFor="annMessage">Message</Label><Textarea id="annMessage" value={newAnnouncement.message} onChange={(e) => setNewAnnouncement(prev => ({ ...prev, message: e.target.value }))} className="min-h-[100px]" placeholder="Details of the announcement..." /></div>
                      <div className="space-y-2"><Label htmlFor="annTarget" className="flex items-center"><Target className="mr-1 h-4 w-4"/>Target</Label>
                        <Select value={newAnnouncement.target_audience} onValueChange={(value: "All" | "Students" | "Teachers") => setNewAnnouncement(prev => ({ ...prev, target_audience: value }))}>
                          <SelectTrigger className="w-full" id="annTarget"><SelectValue placeholder="Select target audience" /></SelectTrigger>
                          <SelectContent>{ANNOUNCEMENT_TARGETS.map(target => (<SelectItem key={target.value} value={target.value}>{target.label}</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAnnouncementDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleSaveAnnouncement} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}<MessageSquare className="mr-2 h-4 w-4" /> Post & Notify
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {announcements.slice(0,5).map(ann => (
                         <div key={ann.id} className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-12 text-center text-xs">
                                <p className="font-bold">{new Date(ann.created_at).getDate()}</p>
                                <p className="text-muted-foreground">{new Date(ann.created_at).toLocaleString('default', { month: 'short' })}</p>
                            </div>
                            <div className="flex-1 border-l-2 pl-4">
                                <p className="font-semibold text-sm">{ann.title}</p>
                                <p className="text-xs text-muted-foreground">{ann.message.substring(0,80)}...</p>
                            </div>
                        </div>
                    ))}
                    {announcements.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">No announcements found.</p>}
                </div>
            </CardContent>
            <CardFooter>
                 <Button variant="outline" className="w-full" asChild><Link href="/admin/announcements">View All Announcements</Link></Button>
            </CardFooter>
        </Card>
        <Card>
            <CardHeader>
                 <CardTitle className="flex items-center"><ShieldAlert className="mr-2 h-6 w-6"/> Recent Behavior Logs</CardTitle>
                 <CardDescription>Latest 5 student behavior incidents.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {behaviorLogs.slice(0,5).map(log => (
                        <div key={log.id} className="flex items-start gap-4">
                            <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-white ${log.type.includes('Positive') ? 'bg-green-500' : 'bg-red-500'}`}>
                               <ShieldAlert className="h-5 w-5"/>
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-sm">{log.student_name}: {log.type}</p>
                                <p className="text-xs text-muted-foreground">{log.description.substring(0,80)}...</p>
                            </div>
                        </div>
                    ))}
                    {behaviorLogs.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">No behavior logs found.</p>}
                </div>
            </CardContent>
             <CardFooter>
                <Button variant="outline" className="w-full" asChild><Link href="/admin/behavior-logs">View All Behavior Logs</Link></Button>
            </CardFooter>
        </Card>
        <Card>
            <CardHeader>
                 <CardTitle className="flex items-center"><Cake className="mr-2 h-6 w-6"/> Upcoming Birthdays</CardTitle>
                 <CardDescription>Birthdays in the next 3 days.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {upcomingBirthdays.map(birthday => (
                        <div key={`${birthday.role}-${birthday.id}`} className="flex items-start gap-4">
                            <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-white ${
                                birthday.days_until_birthday === 0 ? 'bg-red-500' : 
                                birthday.days_until_birthday === 1 ? 'bg-orange-500' : 
                                'bg-blue-500'
                            }`}>
                               <Cake className="h-5 w-5"/>
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-sm">{birthday.full_name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {birthday.role === 'student' ? `Student${birthday.grade_level ? ` - ${birthday.grade_level}` : ''}` : 'Teacher'}
                                </p>
                                <p className="text-xs font-medium text-blue-600">
                                    {birthday.days_until_birthday === 0 ? 'Today!' : 
                                     birthday.days_until_birthday === 1 ? 'Tomorrow' : 
                                     `In ${birthday.days_until_birthday} days`}
                                </p>
                            </div>
                        </div>
                    ))}
                    {upcomingBirthdays.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">No upcoming birthdays.</p>}
                </div>
            </CardContent>
             <CardFooter>
                <Button variant="outline" className="w-full" asChild><Link href="/admin/users">View All Users</Link></Button>
            </CardFooter>
        </Card>
      </div>

    </div>
  );
}
