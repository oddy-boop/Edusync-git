
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase"; // db import removed
import { signOut, onAuthStateChanged, type User } from "firebase/auth";
// Firestore imports removed: doc, onSnapshot, getDoc
import { CURRENTLY_LOGGED_IN_STUDENT_ID, APP_SETTINGS_KEY, REGISTERED_TEACHERS_KEY } from "@/lib/constants"; // Added REGISTERED_TEACHERS_KEY

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

interface TeacherProfile { // Local type for teacher profile from localStorage
  uid: string;
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
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = React.useState(true);
  const [authChecked, setAuthChecked] = React.useState(false);
  const [copyrightYear, setCopyrightYear] = React.useState(new Date().getFullYear().toString());
  const [userDisplayIdentifier, setUserDisplayIdentifier] = React.useState<string>("");

  const [sidebarOpenState, setSidebarOpenState] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const cookieValue = typeof document !== 'undefined' ? document.cookie.includes(`${SIDEBAR_COOKIE_NAME}=true`) : true;
    setSidebarOpenState(cookieValue);
  }, []);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthChecked(true);
      if (user) {
        setCurrentUser(user);
        let displayName = user.displayName;
        let email = user.email;

        if (displayName && displayName.trim() !== "") {
          setUserDisplayIdentifier(displayName);
        } else if (userRole === "Teacher" && user.uid && typeof window !== 'undefined') {
          try {
            const teachersRaw = localStorage.getItem(REGISTERED_TEACHERS_KEY);
            const teachers: TeacherProfile[] = teachersRaw ? JSON.parse(teachersRaw) : [];
            const teacherData = teachers.find(t => t.uid === user.uid);
            
            if (teacherData && teacherData.fullName && teacherData.fullName.trim() !== "") {
              setUserDisplayIdentifier(teacherData.fullName);
            } else if (email) {
              setUserDisplayIdentifier(email);
            } else {
              setUserDisplayIdentifier("Teacher");
            }
          } catch (error) {
            console.error("Error fetching teacher profile from localStorage for display name:", error);
            if (email) { setUserDisplayIdentifier(email); } else { setUserDisplayIdentifier("Teacher"); }
          }
        } else if (email) {
          setUserDisplayIdentifier(email);
        } else {
          setUserDisplayIdentifier(userRole);
        }
      } else {
        setCurrentUser(null);
        setUserDisplayIdentifier("");
      }
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, [userRole]);

  React.useEffect(() => {
    // Load copyright year from localStorage
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
    if (authChecked) {
      if (userRole === "Student") {
        let loggedInStudentId: string | null = null;
        if (typeof window !== 'undefined') {
          loggedInStudentId = localStorage.getItem(CURRENTLY_LOGGED_IN_STUDENT_ID) || sessionStorage.getItem(CURRENTLY_LOGGED_IN_STUDENT_ID);
        }
        
        if (!loggedInStudentId && !pathname.startsWith('/auth/student/')) {
          router.push("/auth/student/login");
        }
      } else {
        if (!currentUser && !pathname.startsWith(`/auth/${userRole.toLowerCase()}/`)) {
          let loginPath = "/";
          if (userRole === "Admin") loginPath = "/auth/admin/login";
          else if (userRole === "Teacher") loginPath = "/auth/teacher/login";
          
          if (pathname !== loginPath && loginPath !== "/") {
             router.push(loginPath);
          } else if (pathname !== loginPath && loginPath === "/" && userRole !== "Student") {
            console.warn(`DashboardLayout: Unexpected loginPath for ${userRole}, redirecting to homepage.`);
            router.push("/");
          }
        }
      }
    }
  }, [authChecked, currentUser, pathname, router, userRole]);


  const handleLogout = async () => {
    try {
      let loginPath = "/";

      if (userRole === "Student") {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(CURRENTLY_LOGGED_IN_STUDENT_ID);
          sessionStorage.removeItem(CURRENTLY_LOGGED_IN_STUDENT_ID);
        }
        loginPath = "/auth/student/login";
      } else {
        await signOut(auth);
        if (userRole === "Admin") {
          loginPath = "/auth/admin/login";
        } else if (userRole === "Teacher") {
          loginPath = "/auth/teacher/login";
        }
      }
      
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push(loginPath);

    } catch (error) {
      console.error("Logout error:", error);
      toast({ title: "Logout Failed", description: "Could not log out. Please try again.", variant: "destructive" });
    }
  };

  const isControlled = typeof sidebarOpenState === 'boolean';

  if (!authChecked || isLoadingAuth) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="flex flex-col items-center">
                <Logo size="lg" />
                <Loader2 className="mt-4 h-8 w-8 animate-spin text-primary" />
                <p className="mt-2 text-lg text-muted-foreground">Authenticating...</p>
            </div>
        </div>
    );
  }
  
  if (userRole !== "Student") {
    if (authChecked && !currentUser && !pathname.startsWith(`/auth/${userRole.toLowerCase()}/`)) {
        return ( /* Loading/Redirecting screen */ <div className="flex items-center justify-center min-h-screen bg-background"><div className="flex flex-col items-center"><Logo size="lg" /><Loader2 className="mt-4 h-8 w-8 animate-spin text-primary" /><p className="mt-2 text-lg text-muted-foreground">Redirecting to login...</p></div></div>);
    }
  } else {
    if (authChecked && typeof window !== 'undefined' && 
        !localStorage.getItem(CURRENTLY_LOGGED_IN_STUDENT_ID) && 
        !sessionStorage.getItem(CURRENTLY_LOGGED_IN_STUDENT_ID) && 
        !pathname.startsWith('/auth/student/')) {
        return ( /* Loading/Redirecting screen */ <div className="flex items-center justify-center min-h-screen bg-background"><div className="flex flex-col items-center"><Logo size="lg" /><Loader2 className="mt-4 h-8 w-8 animate-spin text-primary" /><p className="mt-2 text-lg text-muted-foreground">Redirecting to login...</p></div></div>);
    }
  }

  const headerText = `${userRole} Dashboard${userRole !== 'Student' && userDisplayIdentifier ? ` - (${userDisplayIdentifier})` : ''}`;

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
