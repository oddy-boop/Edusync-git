
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSupabase } from "@/lib/supabaseClient"; 
import type { SupabaseClient, User as SupabaseUser, Session } from "@supabase/supabase-js"; 
import { 
    ADMIN_LOGGED_IN_KEY,
    TEACHER_LOGGED_IN_UID_KEY,
} from "@/lib/constants";

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
        console.error(`DashboardLayout: Failed to initialize Supabase client:`, initError.message);
        if (isMounted.current) setIsLoggedIn(false);
        return;
      }

      const handleAuthChange = async (event: string, session: Session | null) => {
        if (!isMounted.current) return;

        console.log(`DashboardLayout (${userRole}): onAuthStateChange event: ${event}`);

        if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
          setIsLoggedIn(false);
          setUserDisplayIdentifier(userRole);
          if (userRole === "Admin") localStorage.removeItem(ADMIN_LOGGED_IN_KEY);
          if (userRole === "Teacher") localStorage.removeItem(TEACHER_LOGGED_IN_UID_KEY);
          return;
        }

        if (session && session.user) {
          try {
             let profileName: string | null = null;
             if (userRole === "Admin") {
                const localAdminFlag = typeof window !== 'undefined' ? localStorage.getItem(ADMIN_LOGGED_IN_KEY) === "true" : false;
                if(localAdminFlag) {
                    profileName = session.user.user_metadata?.full_name || "Admin";
                }
             } else if (userRole === "Teacher") {
                const { data: teacherProfile } = await supabase.from('teachers').select('full_name').eq('auth_user_id', session.user.id).single();
                profileName = teacherProfile?.full_name || "Teacher";
             } else if (userRole === "Student") {
                const { data: studentProfile } = await supabase.from('students').select('full_name').eq('auth_user_id', session.user.id).single();
                profileName = studentProfile?.full_name || "Student";
             }
             
             if (profileName) {
                setIsLoggedIn(true);
                setUserDisplayIdentifier(profileName);
             } else {
                console.warn(`No profile found for ${userRole} with auth id ${session.user.id}. Logging out.`);
                await supabase.auth.signOut();
             }
          } catch(e) {
             console.error(`Error fetching profile during auth change for ${userRole}:`, e);
             await supabase.auth.signOut();
          }
        } else {
            setIsLoggedIn(false);
            setUserDisplayIdentifier(userRole);
        }
      };
      
      const { data: { session } } = await supabase.auth.getSession();
      handleAuthChange('INITIAL_SESSION', session);
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
  }, [userRole]); 

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
      const isAuthPage = pathname.startsWith(`/auth/${userRole.toLowerCase()}/`);
      if (!isAuthPage) {
        router.push(`/auth/${userRole.toLowerCase()}/login`);
      }
    }
  }, [isSessionChecked, isLoggedIn, pathname, router, userRole]);

  const handleLogout = async () => {
    const supabase = getSupabase();
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error("Logout error:", error);
      toast({ title: "Logout Failed", description: "Could not log out. Please try again.", variant: "destructive" });
    } else {
      if (userRole === "Admin") localStorage.removeItem(ADMIN_LOGGED_IN_KEY);
      if (userRole === "Teacher") localStorage.removeItem(TEACHER_LOGGED_IN_UID_KEY);
      
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      // The onAuthStateChange listener will handle the redirect.
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
          &copy; {copyrightYear} St. Joseph's Montessori. All Rights Reserved.
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
