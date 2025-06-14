
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
  ClipboardCheck as ResultsIcon, // Added for results
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase"; // Firebase auth
import { onAuthStateChanged, signOut, type User as FirebaseUser } from "firebase/auth";
import { 
    CURRENTLY_LOGGED_IN_STUDENT_ID, 
    APP_SETTINGS_KEY, 
    REGISTERED_TEACHERS_KEY,
    ADMIN_LOGGED_IN_KEY,
    TEACHER_LOGGED_IN_UID_KEY,
    ADMIN_CREDENTIALS_KEY // To get admin display name
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
  ResultsIcon, // Added
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

interface TeacherProfile {
  uid: string;
  fullName: string;
  email: string;
}
interface AdminStoredCredentials {
  fullName: string;
  email: string;
}


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
  
  const [isSessionChecked, setIsSessionChecked] = React.useState(false);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [userDisplayIdentifier, setUserDisplayIdentifier] = React.useState<string>(userRole);
  
  const [copyrightYear, setCopyrightYear] = React.useState(new Date().getFullYear().toString());
  const [sidebarOpenState, setSidebarOpenState] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const cookieValue = typeof document !== 'undefined' ? document.cookie.includes(`${SIDEBAR_COOKIE_NAME}=true`) : true;
    setSidebarOpenState(cookieValue);
  }, []);

  React.useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    if (userRole === "Admin") {
      unsubscribe = onAuthStateChanged(auth, (user) => {
        const localAdminFlag = typeof window !== 'undefined' ? localStorage.getItem(ADMIN_LOGGED_IN_KEY) === "true" : false;
        if (user && localAdminFlag) {
          setIsLoggedIn(true);
          // Get display name from Firebase or localStorage fallback
           let displayName = user.displayName || "Admin";
           if (typeof window !== 'undefined') {
              const adminCredsRaw = localStorage.getItem(ADMIN_CREDENTIALS_KEY);
              if (adminCredsRaw) {
                  try {
                      const creds: AdminStoredCredentials = JSON.parse(adminCredsRaw);
                      if (creds.email === user.email) displayName = creds.fullName || user.displayName || "Admin";
                  } catch (e) {console.warn("Error parsing admin creds for display name");}
              }
           }
           setUserDisplayIdentifier(displayName);
        } else {
          setIsLoggedIn(false);
          setUserDisplayIdentifier(userRole);
          if (localAdminFlag && !user) { // Local flag set, but no Firebase user, sign out locally
            if (typeof window !== 'undefined') localStorage.removeItem(ADMIN_LOGGED_IN_KEY);
          }
        }
        setIsSessionChecked(true);
      });
    } else if (userRole === "Teacher") {
      const teacherUid = typeof window !== 'undefined' ? localStorage.getItem(TEACHER_LOGGED_IN_UID_KEY) : null;
      if (teacherUid) {
        setIsLoggedIn(true);
        try {
          const teachersRaw = typeof window !== 'undefined' ? localStorage.getItem(REGISTERED_TEACHERS_KEY) : null;
          const teachers: TeacherProfile[] = teachersRaw ? JSON.parse(teachersRaw) : [];
          const teacherData = teachers.find(t => t.uid === teacherUid);
          setUserDisplayIdentifier(teacherData?.fullName || "Teacher");
        } catch (e) { console.error("Error fetching teacher name for display:", e); setUserDisplayIdentifier("Teacher"); }
      } else {
        setIsLoggedIn(false);
        setUserDisplayIdentifier(userRole);
      }
      setIsSessionChecked(true);
    } else if (userRole === "Student") {
      const studentId = typeof window !== 'undefined' ? (localStorage.getItem(CURRENTLY_LOGGED_IN_STUDENT_ID) || sessionStorage.getItem(CURRENTLY_LOGGED_IN_STUDENT_ID)) : null;
      if (studentId) {
        setIsLoggedIn(true);
        setUserDisplayIdentifier(studentId);
      } else {
        setIsLoggedIn(false);
        setUserDisplayIdentifier(userRole);
      }
      setIsSessionChecked(true);
    } else {
        setIsSessionChecked(true); // For any other role or if role logic changes
    }
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userRole]);


  React.useEffect(() => {
    if (typeof window !== 'undefined') {
        try {
            const settingsRaw = localStorage.getItem(APP_SETTINGS_KEY);
            if (settingsRaw) {
                const settings = JSON.parse(settingsRaw);
                setCopyrightYear(getCopyrightEndYear(settings.currentAcademicYear));
            } else {
                setCopyrightYear(new Date().getFullYear().toString());
            }
        } catch (error) {
            console.error("DashboardLayout: Error loading app settings from localStorage:", error);
            setCopyrightYear(new Date().getFullYear().toString());
        }
    }
  }, []);

  React.useEffect(() => {
    if (isSessionChecked && !isLoggedIn) {
      const currentBasePath = `/${userRole.toLowerCase()}/`;
      const isAuthRelatedPage = pathname.startsWith(`/auth/${userRole.toLowerCase()}/`);

      if (pathname.startsWith(currentBasePath) && !isAuthRelatedPage) {
        let loginPath = "/";
        if (userRole === "Student") loginPath = "/auth/student/login";
        else if (userRole === "Admin") loginPath = "/auth/admin/login";
        else if (userRole === "Teacher") loginPath = "/auth/teacher/login";
        
        if (loginPath !== "/") router.push(loginPath);
      }
    }
  }, [isSessionChecked, isLoggedIn, pathname, router, userRole]);

  const handleLogout = async () => {
    try {
      let loginPath = "/";
      if (userRole === "Admin") {
        await signOut(auth);
        if (typeof window !== 'undefined') localStorage.removeItem(ADMIN_LOGGED_IN_KEY);
        loginPath = "/auth/admin/login";
      } else if (userRole === "Teacher") {
        if (typeof window !== 'undefined') localStorage.removeItem(TEACHER_LOGGED_IN_UID_KEY);
        loginPath = "/auth/teacher/login";
      } else if (userRole === "Student") {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(CURRENTLY_LOGGED_IN_STUDENT_ID);
          sessionStorage.removeItem(CURRENTLY_LOGGED_IN_STUDENT_ID);
        }
        loginPath = "/auth/student/login";
      }
      
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      setIsLoggedIn(false); 
      setUserDisplayIdentifier(userRole);
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
  if (isSessionChecked && !isLoggedIn && !isAuthPage ) {
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
        setSidebarOpenState(newState);
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
