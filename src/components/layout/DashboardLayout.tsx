
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
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/Logo";
import { SheetTitle } from "@/components/ui/sheet"; // SheetTitle is needed
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSupabase } from "@/lib/supabaseClient"; 
import type { SupabaseClient, User as SupabaseUser, Session } from "@supabase/supabase-js"; 
import { 
    CURRENTLY_LOGGED_IN_STUDENT_ID, 
    ADMIN_LOGGED_IN_KEY,
    TEACHER_LOGGED_IN_UID_KEY,
} from "@/lib/constants";
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile

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
  userRole: string;
}

const SIDEBAR_COOKIE_NAME = "sidebar_state_sjm";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function getCopyrightEndYear(academicYearString?: string | null): string {
  if (academicYearString) {
    const parts = academicYearString.split(/[-–—]/);
    const lastPart = parts[parts.length - 1].trim();
    if (/^\d{4}$/.test(lastPart)) {
      return lastPart;
    }
  }
  return new Date().getFullYear().toString();
}

export default function DashboardLayout({ children, navItems, userRole }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const isMounted = React.useRef(true);
  const isMobile = useIsMobile(); // Use the hook here
  
  const [isSessionChecked, setIsSessionChecked] = React.useState(false);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [userDisplayIdentifier, setUserDisplayIdentifier] = React.useState<string>(userRole);
  
  const [copyrightYear, setCopyrightYear] = React.useState(new Date().getFullYear().toString());
  const [sidebarOpenState, setSidebarOpenState] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    isMounted.current = true;
    const cookieValue = typeof document !== 'undefined' ? document.cookie.includes(`${SIDEBAR_COOKIE_NAME}=true`) : true;
    if (isMounted.current) setSidebarOpenState(cookieValue);
    
    return () => {
      isMounted.current = false;
    }
  }, []);

  React.useEffect(() => {
    let supabaseAuthSubscription: { data: { subscription: any } } | undefined;

    const performSessionChecks = async () => {
      if (!isMounted.current) return;

      let supabase: SupabaseClient | null = null;
      try {
        supabase = getSupabase(); 
      } catch (initError: any) {
        console.error(`DashboardLayout: Failed to initialize Supabase client for session checks:`, initError.message);
        if (isMounted.current) {
            setIsLoggedIn(false);
            setUserDisplayIdentifier(userRole);
        }
        return;
      }

      try {
        if (userRole === "Admin") {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError && isMounted.current) {
            console.error("DashboardLayout (Admin): Supabase getSession error on initial load:", sessionError.message);
            if (typeof window !== 'undefined') localStorage.removeItem(ADMIN_LOGGED_IN_KEY);
            setIsLoggedIn(false);
            setUserDisplayIdentifier(userRole);
            try {
              await supabase.auth.signOut();
              console.log("DashboardLayout (Admin): Explicit signOut performed due to getSession error.");
            } catch (signOutError: any) {
              console.error("DashboardLayout (Admin): Error during explicit signOut attempt:", signOutError.message);
            }
          } else {
            const localAdminFlag = typeof window !== 'undefined' ? localStorage.getItem(ADMIN_LOGGED_IN_KEY) === "true" : false;
            if (session && session.user && localAdminFlag) {
              if (isMounted.current) {
                setIsLoggedIn(true);
                setUserDisplayIdentifier(session.user.user_metadata?.full_name || "Admin");
              }
            } else {
              if (isMounted.current) {
                setIsLoggedIn(false);
                setUserDisplayIdentifier(userRole);
                if (localAdminFlag && !session && typeof window !== 'undefined') {
                  localStorage.removeItem(ADMIN_LOGGED_IN_KEY);
                   try { await supabase.auth.signOut(); console.log("DashboardLayout (Admin): Signed out Supabase session due to missing session but local flag present."); } catch(e) { /* ignore */ }
                } else if (!localAdminFlag && session) { 
                   try { await supabase.auth.signOut(); console.log("DashboardLayout (Admin): Signed out Supabase session due to existing session but no local flag."); } catch(e) { /* ignore */ }
                }
              }
            }
          }
          
          const { data: subscriptionData, error: subscriptionError } = supabase.auth.onAuthStateChange((event, newSession) => {
             if (!isMounted.current) return;
             console.log(`DashboardLayout (Admin): onAuthStateChange event: ${event}, newSession user: ${newSession?.user?.id}`);
             const currentLocalAdminFlag = typeof window !== 'undefined' ? localStorage.getItem(ADMIN_LOGGED_IN_KEY) === "true" : false;

             if (event === 'SIGNED_OUT' || event === 'USER_DELETED' || (event === 'TOKEN_REFRESHED' && !newSession) || (event === 'INITIAL_SESSION' && !newSession)) {
                 setIsLoggedIn(false);
                 setUserDisplayIdentifier(userRole);
                 if (typeof window !== 'undefined') localStorage.removeItem(ADMIN_LOGGED_IN_KEY);
                 console.log(`DashboardLayout (Admin): Auth event '${event}' led to logout state.`);
             } else if (newSession && newSession.user && currentLocalAdminFlag) {
                setIsLoggedIn(true);
                setUserDisplayIdentifier(newSession.user.user_metadata?.full_name || "Admin");
             } else { 
                setIsLoggedIn(false);
                setUserDisplayIdentifier(userRole);
                if (currentLocalAdminFlag && !newSession && typeof window !== 'undefined') {
                   localStorage.removeItem(ADMIN_LOGGED_IN_KEY);
                }
             }
          });
          if (subscriptionError && isMounted.current) {
             console.error("DashboardLayout (Admin): Supabase onAuthStateChange setup error:", subscriptionError.message);
          }
          supabaseAuthSubscription = subscriptionData;

        } else if (userRole === "Teacher") {
          const teacherUid = typeof window !== 'undefined' ? localStorage.getItem(TEACHER_LOGGED_IN_UID_KEY) : null;
          if (teacherUid) {
            const { data: teacherData, error: teacherError } = await supabase
              .from('teachers')
              .select('full_name, auth_user_id') 
              .eq('auth_user_id', teacherUid) 
              .single();
            
            if (isMounted.current) {
              if (teacherError && teacherError.code !== 'PGRST116') { 
                console.error("DashboardLayout (Teacher): Error fetching teacher name, potentially due to auth issue:", teacherError.message, teacherError);
                setUserDisplayIdentifier("Teacher");
                setIsLoggedIn(false); 
                if (typeof window !== 'undefined') localStorage.removeItem(TEACHER_LOGGED_IN_UID_KEY);
                try {
                  await supabase.auth.signOut(); 
                  console.log("DashboardLayout (Teacher): Explicit signOut performed due to teacher profile fetch error.");
                } catch (signOutErr: any) {
                  console.error("DashboardLayout (Teacher): Error during explicit signOut attempt:", signOutErr.message);
                }
              } else if (teacherData) {
                setUserDisplayIdentifier(teacherData.full_name || "Teacher");
                setIsLoggedIn(true);
              } else { 
                console.warn("DashboardLayout (Teacher): Teacher UID from localStorage not found in Supabase 'teachers' table, or no data returned. Logging out.");
                setUserDisplayIdentifier("Teacher");
                setIsLoggedIn(false);
                if (typeof window !== 'undefined') localStorage.removeItem(TEACHER_LOGGED_IN_UID_KEY);
                try {
                  await supabase.auth.signOut(); 
                  console.log("DashboardLayout (Teacher): Explicit signOut performed due to missing profile for stored UID.");
                } catch (signOutErr: any) {
                  console.error("DashboardLayout (Teacher): Error during explicit signOut for missing profile:", signOutErr.message);
                }
              }
            }
          } else { 
            if (isMounted.current) {
              setIsLoggedIn(false);
              setUserDisplayIdentifier(userRole);
            }
          }
        } else if (userRole === "Student") {
          const studentId = typeof window !== 'undefined' ? (localStorage.getItem(CURRENTLY_LOGGED_IN_STUDENT_ID) || sessionStorage.getItem(CURRENTLY_LOGGED_IN_STUDENT_ID)) : null;
          if (isMounted.current) {
            if (studentId) {
              setIsLoggedIn(true);
              try {
                const { data: studentData, error: studentNameError } = await supabase
                  .from('students')
                  .select('full_name')
                  .eq('student_id_display', studentId)
                  .single();
                if (studentNameError && studentNameError.code !== 'PGRST116') {
                  console.warn("DashboardLayout (Student): Could not fetch student name:", studentNameError.message);
                  setUserDisplayIdentifier(studentId); 
                } else if (studentData) {
                  setUserDisplayIdentifier(studentData.full_name || studentId);
                } else {
                   setUserDisplayIdentifier(studentId); 
                }
              } catch (e) {
                 console.warn("DashboardLayout (Student): Exception fetching student name.");
                 setUserDisplayIdentifier(studentId);
              }
            } else {
              setIsLoggedIn(false);
              setUserDisplayIdentifier(userRole);
            }
          }
        }
      } catch (e: any) {
        console.error(`DashboardLayout: Uncaught error in performSessionChecks for ${userRole}:`, e.message);
        if (isMounted.current) {
            setIsLoggedIn(false);
            setUserDisplayIdentifier(userRole);
        }
      } finally {
        if (isMounted.current) {
            setIsSessionChecked(true);
        }
      }
    };
    
    performSessionChecks();
    
    return () => {
      supabaseAuthSubscription?.data?.subscription?.unsubscribe();
    };
  }, [userRole, router]); 

  React.useEffect(() => {
    async function fetchCopyrightYear() {
        if (!isMounted.current || typeof window === 'undefined') return;
        
        let supabase: SupabaseClient | null = null;
        try {
            supabase = getSupabase();
        } catch (initError: any) {
            console.error("DashboardLayout: Failed to initialize Supabase client for copyright year:", initError.message);
            if(isMounted.current) setCopyrightYear(new Date().getFullYear().toString());
            return;
        }

        try {
            const { data, error } = await supabase
                .from('app_settings')
                .select('current_academic_year')
                .eq('id', 1)
                .single();

            if (isMounted.current) {
                if (error && error.code !== 'PGRST116') {
                    console.error("DashboardLayout: Error loading app settings from Supabase:", error.message);
                    setCopyrightYear(new Date().getFullYear().toString());
                } else if (data) {
                    setCopyrightYear(getCopyrightEndYear(data.current_academic_year));
                } else { 
                    setCopyrightYear(new Date().getFullYear().toString());
                }
            }
        } catch (e: any) {
            console.error("DashboardLayout: Exception fetching app settings:", e.message);
            if (isMounted.current) setCopyrightYear(new Date().getFullYear().toString());
        }
    }
    fetchCopyrightYear();
  }, []); 

  React.useEffect(() => {
    if (isSessionChecked && !isLoggedIn) {
      const currentBasePath = `/${userRole.toLowerCase()}`;
      const isAuthRelatedPage = pathname.startsWith(`/auth/${userRole.toLowerCase()}/`);

      if (pathname.startsWith(currentBasePath) && !isAuthRelatedPage) {
        let loginPath = "/";
        if (userRole === "Student") loginPath = "/auth/student/login";
        else if (userRole === "Admin") loginPath = "/auth/admin/login";
        else if (userRole === "Teacher") loginPath = "/auth/teacher/login";
        
        if (loginPath !== "/" && isMounted.current) {
            router.push(loginPath);
        }
      }
    }
  }, [isSessionChecked, isLoggedIn, pathname, router, userRole]);

  const handleLogout = async () => {
    let supabase: SupabaseClient | null = null;
    try {
        supabase = getSupabase();
    } catch (initError: any) {
        console.error("DashboardLayout: Failed to initialize Supabase client for logout:", initError.message);
        toast({ title: "Logout Failed", description: "Supabase client error. Please try again.", variant: "destructive" });
        return;
    }

    try {
      let loginPath = "/";
      if (userRole === "Admin" || userRole === "Teacher") {
        await supabase.auth.signOut();
        if (typeof window !== 'undefined') {
          if (userRole === "Admin") localStorage.removeItem(ADMIN_LOGGED_IN_KEY);
          if (userRole === "Teacher") localStorage.removeItem(TEACHER_LOGGED_IN_UID_KEY);
        }
        loginPath = userRole === "Admin" ? "/auth/admin/login" : "/auth/teacher/login";
      } else if (userRole === "Student") {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(CURRENTLY_LOGGED_IN_STUDENT_ID);
          sessionStorage.removeItem(CURRENTLY_LOGGED_IN_STUDENT_ID);
        }
        loginPath = "/auth/student/login";
      }
      
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      if (isMounted.current) {
          setIsLoggedIn(false); 
          setUserDisplayIdentifier(userRole);
      }
      router.push(loginPath);

    } catch (error) {
      console.error("Logout error:", error);
      toast({ title: "Logout Failed", description: "Could not log out. Please try again.", variant: "destructive" });
    }
  };

  const isControlled = typeof sidebarOpenState === 'boolean';

  if (!isSessionChecked) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="flex flex-col items-center">
                <Logo size="lg" />
                <Loader2 className="mt-4 h-8 w-8 animate-spin text-primary" />
                <p className="mt-2 text-lg text-muted-foreground">Initializing session...</p>
            </div>
        </div>
    );
  }
  
  const isAuthPage = pathname.includes(`/auth/${userRole.toLowerCase()}/`);
  if (isSessionChecked && !isLoggedIn && !isAuthPage && pathname.startsWith(`/${userRole.toLowerCase()}`) ) {
     return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="flex flex-col items-center">
                <Logo size="lg" />
                <Loader2 className="mt-4 h-8 w-8 animate-spin text-primary" />
                <p className="mt-2 text-lg text-muted-foreground">Redirecting to login...</p>
            </div>
        </div>
      );
  }

  const headerText = `${userRole} Portal${userDisplayIdentifier && userDisplayIdentifier !== userRole && !userDisplayIdentifier.match(/^\d{3}SJM\d{4}$/) ? ` - (${userDisplayIdentifier})` : ''}`;


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
             <Logo size="sm" className="text-sidebar-foreground group-data-[collapsible=icon]:hidden" />
            <SidebarTrigger className="text-sidebar-foreground hover:text-sidebar-accent-foreground" />
          </div>
           {isMobile && (
            <SheetTitle className="sr-only">{userRole} Portal Navigation</SheetTitle>
           )}
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarMenu>
            {navItems.map((item) => {
              const IconComponent = iconComponents[item.iconName];
              const baseHref = item.href.endsWith('/') ? item.href.slice(0, -1) : item.href;
              const isActive = pathname === baseHref || 
                               (baseHref !== `/${userRole.toLowerCase()}/dashboard` && pathname.startsWith(baseHref + '/')) ||
                               (pathname === `/${userRole.toLowerCase()}/dashboard` && item.href === `/${userRole.toLowerCase()}/dashboard`);
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
          &copy; {copyrightYear} St. Joseph's Montessori. All Rights Reserved.
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
