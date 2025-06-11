
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase"; // Import Firebase auth and db
import { signOut, onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot, getDoc } from "firebase/firestore"; // Added getDoc

const APP_SETTINGS_DOC_ID = "general";
const APP_SETTINGS_COLLECTION = "appSettings";

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
  const [copyrightYear, setCopyrightYear] = React.useState(new Date().getFullYear().toString());
  const [userDisplayIdentifier, setUserDisplayIdentifier] = React.useState<string>("");

  const [sidebarOpenState, setSidebarOpenState] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const cookieValue = typeof document !== 'undefined' ? document.cookie.includes(`${SIDEBAR_COOKIE_NAME}=true`) : true;
    setSidebarOpenState(cookieValue);
  }, []);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => { // Make async
      setCurrentUser(user);
      setIsLoadingAuth(false);
      if (user) {
        let displayName = user.displayName;
        let email = user.email;

        if (displayName && displayName.trim() !== "") {
          setUserDisplayIdentifier(displayName);
        } else if (userRole === "Teacher") {
          // Attempt to fetch from Firestore for teachers if Auth displayName is missing
          try {
            const teacherDocRef = doc(db, "teachers", user.uid);
            const teacherDocSnap = await getDoc(teacherDocRef);
            if (teacherDocSnap.exists()) {
              const teacherData = teacherDocSnap.data();
              if (teacherData.fullName && teacherData.fullName.trim() !== "") {
                setUserDisplayIdentifier(teacherData.fullName);
              } else if (email) {
                setUserDisplayIdentifier(email);
              } else {
                setUserDisplayIdentifier(""); // Fallback if no name and no email
              }
            } else if (email) { // Teacher doc doesn't exist, fallback to email
              setUserDisplayIdentifier(email);
            } else {
              setUserDisplayIdentifier("");
            }
          } catch (error) {
            console.error("Error fetching teacher profile for display name:", error);
            if (email) {
              setUserDisplayIdentifier(email); // Fallback to email on error
            } else {
              setUserDisplayIdentifier("");
            }
          }
        } else if (email) { // For Admin or other roles if displayName is missing (admin should set via profile)
          setUserDisplayIdentifier(email);
        } else {
          setUserDisplayIdentifier("");
        }
      } else {
        setUserDisplayIdentifier("");
      }
    });
    return () => unsubscribe();
  }, [pathname, router, userRole]); // Added userRole to dependency array

  React.useEffect(() => {
    const settingsDocRef = doc(db, APP_SETTINGS_COLLECTION, APP_SETTINGS_DOC_ID);
    const unsubscribeFirestore = onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const settingsData = docSnap.data();
        const academicYearFromFirestore = settingsData.currentAcademicYear;
        setCopyrightYear(getCopyrightEndYear(academicYearFromFirestore));
      } else {
        setCopyrightYear(new Date().getFullYear().toString());
      }
    }, (error) => {
      console.error("DashboardLayout: Error listening to Firestore settings:", error);
      setCopyrightYear(new Date().getFullYear().toString());
    });

    return () => {
      unsubscribeFirestore();
    };
  }, []);


  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout Failed",
        description: "Could not log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const isControlled = typeof sidebarOpenState === 'boolean';

  if (isLoadingAuth && !pathname.startsWith('/auth/')) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="flex flex-col items-center">
                <Logo size="lg" />
                <p className="mt-4 text-lg text-muted-foreground animate-pulse">Loading Dashboard...</p>
            </div>
        </div>
    );
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
              return (
                <SidebarMenuItem key={item.label}>
                  <Link href={item.href}>
                    <SidebarMenuButton
                      isActive={pathname === item.href || (pathname.startsWith(item.href) && item.href !== `/${userRole.toLowerCase()}/dashboard` && pathname !== `/${userRole.toLowerCase()}/dashboard/`)}
                      tooltip={{ children: item.label, className: "text-xs" }}
                      className="justify-start"
                    >
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
                    <SidebarMenuButton
                        isActive={pathname === `/${userRole.toLowerCase()}/profile`}
                        tooltip={{ children: "Profile", className: "text-xs" }}
                        className="justify-start"
                    >
                        <UserCircle className="h-5 w-5" />
                        <span>Profile</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <Link href={`/${userRole.toLowerCase()}/settings`}>
                    <SidebarMenuButton
                        isActive={pathname === `/${userRole.toLowerCase()}/settings`}
                        tooltip={{ children: "Settings", className: "text-xs" }}
                        className="justify-start"
                    >
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
          <div className="md:hidden">
             <SidebarTrigger />
          </div>
          <h1 className="text-xl font-semibold text-primary">{headerText}</h1>
        </header>
        <main className="p-6">
          {children}
        </main>
        <footer className="p-4 border-t text-sm text-muted-foreground text-center">
          &copy; {copyrightYear} St. Joseph's Montessori. All Rights Reserved.
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
