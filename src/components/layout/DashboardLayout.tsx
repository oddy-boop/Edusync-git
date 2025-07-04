
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
  ShieldAlert,
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
  
  const [sidebarOpenState, setSidebarOpenState] = React.useState<boolean | undefined>(undefined);

  // Safely initialize Supabase client
  const supabase = React.useMemo(() => {
    try {
      return getSupabase();
    } catch (e: any) {
      if (isMounted.current) {
        // This is a more user-friendly message for the most common startup error.
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
      router.push(`/auth/${userRole.toLowerCase()}/login`);
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
    if (!supabase) { // Don't run auth checks if supabase client failed to init
        setIsSessionChecked(true); // Mark as checked to prevent infinite loading screen
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
             const { data: settingsData } = await supabase.from('app_settings').select('current_academic_year').eq('id', 1).single();
             if (isMounted.current && settingsData?.current_academic_year) {
                 setAcademicYear(settingsData.current_academic_year);
             }

             let profileExists = false;
             let profileName = userRole;

             if (userRole === "Admin") {
                const localAdminFlag = typeof window !== 'undefined' ? localStorage.getItem(ADMIN_LOGGED_IN_KEY) === "true" : false;
                const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id).eq('role', 'admin').single();
                if(localAdminFlag && roleData) {
                    profileExists = true;
                    profileName = session.user.user_metadata?.full_name || "Admin";
                }
             } else if (userRole === "Teacher") {
                const localTeacherUid = typeof window !== 'undefined' ? localStorage.getItem(TEACHER_LOGGED_IN_UID_KEY) : null;
                const { data: teacherProfile } = await supabase.from('teachers').select('full_name').eq('auth_user_id', session.user.id).single();
                if (teacherProfile && localTeacherUid === session.user.id) {
                    profileExists = true;
                    profileName = teacherProfile.full_name;
                }
             } else if (userRole === "Student") {
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
             } else {
                console.warn(`No valid profile found for ${userRole} with auth id ${session.user.id}.`);
                setIsLoggedIn(true); // Stay logged in to show error, prevent loop
                setSessionError(`Your account is authenticated, but no matching ${userRole} profile was found in the database. Please contact an administrator to resolve this.`);
             }
          } catch(e) {
             console.error(`Error fetching profile during auth change for ${userRole}:`, e);
             setIsLoggedIn(true); // Stay logged in to show error
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
      const isAuthPage = pathname.startsWith(`/auth/${userRole.toLowerCase()}/`);
      if (!isAuthPage) {
        router.push(`/auth/${userRole.toLowerCase()}/login`);
      }
    }
  }, [isSessionChecked, isLoggedIn, sessionError, pathname, router, userRole]);

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
                 <p className="mt-3 text-sm text-muted-foreground">You can find your URL and Key in your Supabase project's API settings. If you've just updated them, please restart the server.</p>
                <Button onClick={handleLogout} className="w-full mt-6"><LogOut className="mr-2"/> Try Again After Fixing</Button>
            </CardContent>
        </Card>
      </div>
    );
  }
  
  const isAuthPage = pathname.includes(`/auth/${userRole.toLowerCase()}/`);
  if (!isLoggedIn && !isAuthPage) {
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

  const headerText = `${userRole} Portal${userDisplayIdentifier && userDisplayIdentifier !== userRole ? ` - (${userDisplayIdentifier})` : ''}`;


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
          <MobileAwareSheetTitle userRole={userRole} />
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
          &copy; {academicYear || new Date().getFullYear()}. All Rights Reserved.
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}

    
