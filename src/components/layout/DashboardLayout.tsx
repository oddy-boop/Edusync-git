
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarTrigger,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  useSidebar, 
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/Logo";
import { SheetTitle } from "@/components/ui/sheet"; 
import {
  LogOut,
  Settings,
  UserCircle,
  LayoutDashboard,
  Users,
  DollarSign,
  BookCheck,
  BarChart2,
  CalendarCheck2,
  ClipboardList,
  Edit,
  BookOpen,
  Brain,
  UserCheck as UserCheckIcon,
  CalendarDays,
  UserPlus,
  Loader2,
  ClipboardCheck as ResultsIcon, 
  ListChecks,
  CheckCircle,
  AlertTriangle,
  ShieldAlert,
  School,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSupabase } from "@/lib/supabaseClient"; 
import type { SupabaseClient, User as SupabaseUser, Session } from "@supabase/supabase-js"; 
import { 
    ADMIN_LOGGED_IN_KEY,
    TEACHER_LOGGED_IN_UID_KEY,
} from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

const iconComponents = {
  LayoutDashboard,
  Users,
  DollarSign,
  BookCheck,
  BarChart2,
  CalendarCheck2,
  ClipboardList,
  Edit,
  BookOpen,
  Brain,
  UserCheck: UserCheckIcon,
  CalendarDays,
  UserPlus,
  ResultsIcon, 
  ListChecks,
  CheckCircle,
  AlertTriangle,
  ShieldAlert,
  School,
};

export type IconName = keyof typeof iconComponents;

export interface NavItem {
  href: string;
  label:string;
  iconName: IconName;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  navItems: NavItem[];
  userRole: "Admin" | "Teacher" | "Student"; // Made more specific
}

const SIDEBAR_COOKIE_NAME = "sidebar_state_edusync";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

const MobileAwareSheetTitle = ({ userRole }: { userRole: string }) => {
  const { isMobile } = useSidebar(); 
  if (!isMobile) {
    return null;
  }
  return <SheetTitle className="sr-only">{userRole} Portal Navigation</SheetTitle>;
};


export default function DashboardLayout({ children, navItems, userRole }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const isMounted = React.useRef(true);
  
  const [isSessionChecked, setIsSessionChecked] = React.useState(false);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [userDisplayIdentifier, setUserDisplayIdentifier] = React.useState<string>(userRole);
  const [sessionError, setSessionError] = React.useState<string | null>(null);
  const [academicYear, setAcademicYear] = React.useState<string | null>(null);
  const [schoolName, setSchoolName] = React.useState<string>("EduSync");
  const [isSuperAdmin, setIsSuperAdmin] = React.useState(false);
  
  const [sidebarOpenState, setSidebarOpenState] = React.useState<boolean | undefined>(undefined);

  const supabase = React.useMemo(() => {
    try {
      return getSupabase();
    } catch (e: any) {
      if (isMounted.current) {
        if (e.message && e.message.includes("Supabase URL is not configured")) {
           setSessionError(`Could not connect to the database. The credentials in the .env file seem to be missing or incorrect. Please open the .env file, add your real Supabase URL and Key, and then restart the server.`);
        } else {
           setSessionError(`Database connection failed: ${e.message}. Please check your environment variables.`);
        }
      }
      return null;
    }
  }, []);

  const handleLogout = React.useCallback(async () => {
    if (!supabase) {
        toast({ title: "Logout Failed", description: "Database client is not available.", variant: "destructive" });
        return;
    }
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error("Logout error:", error);
      toast({ title: "Logout Failed", description: "Could not log out. Please try again.", variant: "destructive" });
    } else {
      if (userRole === "Admin") localStorage.removeItem(ADMIN_LOGGED_IN_KEY);
      if (userRole === "Teacher") localStorage.removeItem(TEACHER_LOGGED_IN_UID_KEY);
      
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push("/");
    }
  }, [supabase, toast, router, userRole]);


  React.useEffect(() => {
    isMounted.current = true;
    const cookieValue = typeof document !== 'undefined' ? document.cookie.includes(`${SIDEBAR_COOKIE_NAME}=true`) : true;
    if (isMounted.current) setSidebarOpenState(cookieValue);
    
    return () => {
      isMounted.current = false;
    }
  }, []);

  React.useEffect(() => {
    if (!supabase) {
        setIsSessionChecked(true); 
        return;
    }
    
    let supabaseAuthSubscription: { data: { subscription: any } } | undefined;

    const performSessionChecks = async () => {
      if (!isMounted.current) return;

      const handleAuthChange = async (event: string, session: Session | null) => {
        if (!isMounted.current) return;

        if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
          setIsLoggedIn(false);
          setSessionError(null);
          setUserDisplayIdentifier(userRole);
          if (userRole === "Admin") localStorage.removeItem(ADMIN_LOGGED_IN_KEY);
          if (userRole === "Teacher") localStorage.removeItem(TEACHER_LOGGED_IN_UID_KEY);
          return;
        }

        if (session && session.user) {
          try {
             let schoolId: string | null = null;
             let profileExists = false;
             let profileName = userRole;

             const { data: roleData } = await supabase.from('user_roles').select('role, school_id').eq('user_id', session.user.id).single();

             if (!roleData) {
                 setIsLoggedIn(false);
                 setSessionError("Your account does not have a role assigned. Please contact support.");
                 return;
             }

             schoolId = roleData.school_id;
             const userActualRole = roleData.role;

             if (userActualRole === 'super_admin' && userRole === 'Admin') {
                 setIsSuperAdmin(true);
                 profileExists = true;
                 profileName = "Super Admin";
             } else if (userActualRole === 'admin' && userRole === 'Admin') {
                 profileExists = true;
                 profileName = session.user.user_metadata?.full_name || "Admin";
             } else if (userActualRole === 'teacher' && userRole === 'Teacher') {
                const { data: teacherProfile } = await supabase.from('teachers').select('full_name').eq('auth_user_id', session.user.id).single();
                if(teacherProfile) {
                    profileExists = true;
                    profileName = teacherProfile.full_name;
                }
             } else if (userActualRole === 'student' && userRole === 'Student') {
                const { data: studentProfile } = await supabase.from('students').select('full_name').eq('auth_user_id', session.user.id).single();
                if (studentProfile) {
                    profileExists = true;
                    profileName = studentProfile.full_name;
                }
             }
             
             if (profileExists) {
                setIsLoggedIn(true);
                setSessionError(null);
                setUserDisplayIdentifier(profileName);

                // Fetch school-specific settings if not a super admin looking at all schools
                if (schoolId) {
                    const { data: settingsData } = await supabase.from('app_settings').select('current_academic_year, school_name').eq('school_id', schoolId).single();
                    if (isMounted.current && settingsData) {
                        setAcademicYear(settingsData.current_academic_year);
                        setSchoolName(settingsData.school_name);
                    }
                }
             } else {
                setIsLoggedIn(false);
                setSessionError(`Your account is authenticated but does not have a valid '${userRole}' profile. Please contact support.`);
             }

          } catch(e) {
             console.error(`Error fetching profile during auth change for ${userRole}:`, e);
             setIsLoggedIn(true); // Still logged in, but with an error state
             setSessionError(`An error occurred while verifying your profile: ${(e as Error).message}`);
          }
        } else {
            setIsLoggedIn(false);
            setSessionError(null);
            setUserDisplayIdentifier(userRole);
        }
      };
      
      const { data: { session } } = await supabase.auth.getSession();
      await handleAuthChange('INITIAL_SESSION', session);
      setIsSessionChecked(true);
      
      const { data: subscriptionData } = supabase.auth.onAuthStateChange((event, newSession) => {
        handleAuthChange(event, newSession);
      });
      supabaseAuthSubscription = subscriptionData;
    };
    
    performSessionChecks();
    
    return () => {
      supabaseAuthSubscription?.data?.subscription?.unsubscribe();
    };
  }, [userRole, supabase]); 

  React.useEffect(() => {
    if (isSessionChecked && !isLoggedIn && !sessionError) {
      router.push(`/`);
    }
  }, [isSessionChecked, isLoggedIn, sessionError, router]);

  const footerYear = React.useMemo(() => {
    if (academicYear && /^\d{4}-\d{4}$/.test(academicYear)) {
        return academicYear.split('-')[1];
    }
    return new Date().getFullYear();
  }, [academicYear]);

  const isControlled = typeof sidebarOpenState === 'boolean';

  if (!isSessionChecked) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="flex flex-col items-center">
                <Logo size="lg" schoolName={schoolName} />
                <Loader2 className="mt-4 h-8 w-8 animate-spin text-primary" />
                <p className="mt-2 text-lg text-muted-foreground">Initializing session...</p>
            </div>
        </div>
    );
  }
  
  if (sessionError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="shadow-2xl border-destructive max-w-lg w-full">
            <CardHeader>
                <CardTitle className="flex items-center text-destructive">
                    <AlertTriangle className="mr-3 h-7 w-7"/> Access Error
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-foreground/90 font-semibold">{sessionError}</p>
                 <p className="mt-3 text-sm text-muted-foreground">Please contact support or try logging in again.</p>
                <Button onClick={handleLogout} className="w-full mt-6"><LogOut className="mr-2"/> Go to Login</Button>
            </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!isLoggedIn) {
     return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="flex flex-col items-center">
                <Logo size="lg" schoolName={schoolName}/>
                <Loader2 className="mt-4 h-8 w-8 animate-spin text-primary" />
                <p className="mt-2 text-lg text-muted-foreground">Redirecting...</p>
            </div>
        </div>
      );
  }

  const headerText = `${userDisplayIdentifier}'s ${userRole} Portal`;
  const finalNavItems = isSuperAdmin ? navItems : navItems.filter(item => item.href !== "/admin/schools");

  return (
    <SidebarProvider
      defaultOpen={true}
      open={isControlled ? sidebarOpenState : undefined}
      onOpenChange={isControlled ? (newState) => {
        if(isMounted.current) setSidebarOpenState(newState);
        if (typeof document !== 'undefined') {
          document.cookie = `${SIDEBAR_COOKIE_NAME}=${newState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
        }
      } : undefined}
    >
      <Sidebar side="left" variant="sidebar" collapsible="icon">
        <SidebarHeader className="p-4 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
             <Logo size="sm" className="text-sidebar-foreground group-data-[collapsible=icon]:hidden" schoolName={schoolName} />
            <SidebarTrigger className="text-sidebar-foreground hover:text-sidebar-accent-foreground" />
          </div>
          <MobileAwareSheetTitle userRole={userRole} />
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarMenu>
            {finalNavItems.map((item) => {
              const IconComponent = iconComponents[item.iconName];
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              
              return (
                <SidebarMenuItem key={item.label}>
                  <Link href={item.href}>
                    <SidebarMenuButton isActive={isActive} tooltip={{ children: item.label, className: "text-xs" }} className="justify-start">
                      {IconComponent && <IconComponent className="h-5 w-5" />}
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-2 border-t border-sidebar-border">
          <SidebarMenu>
             <SidebarMenuItem>
                <Link href={`/${userRole.toLowerCase()}/profile`}>
                    <SidebarMenuButton isActive={pathname === `/${userRole.toLowerCase()}/profile`} tooltip={{ children: "Profile", className: "text-xs" }} className="justify-start">
                        <UserCircle className="h-5 w-5" />
                        <span>Profile</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <Link href={`/${userRole.toLowerCase()}/settings`}>
                    <SidebarMenuButton isActive={pathname === `/${userRole.toLowerCase()}/settings`} tooltip={{ children: "Settings", className: "text-xs" }} className="justify-start">
                        <Settings className="h-5 w-5" />
                        <span>Settings</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout} tooltip={{ children: "Logout", className: "text-xs" }} className="justify-start">
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="p-4 border-b flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-40">
          <div className="md:hidden"><SidebarTrigger /></div>
          <h1 className="text-xl font-semibold text-primary">{headerText}</h1>
        </header>
        <main className="p-6">{children}</main>
        <footer className="p-4 border-t text-sm text-muted-foreground text-center">
          &copy; {footerYear} {schoolName || 'EduSync'}. All Rights Reserved.
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
