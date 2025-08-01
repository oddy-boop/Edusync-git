
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  BookUp,
  Bell,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSupabase } from "@/lib/supabaseClient"; 
import type { SupabaseClient, User as SupabaseUser, Session } from "@supabase/supabase-js"; 
import { AuthContext, useAuth } from "@/lib/auth-context";

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
  BookUp,
  Bell,
};

export type IconName = keyof typeof iconComponents;

export interface NavItem {
  href: string;
  label:string;
  iconName: IconName;
  requiredRole?: 'admin' | 'super_admin';
  notificationId?: string;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  navItems: NavItem[];
  userRole: "Admin" | "Teacher" | "Student";
}

function LoadingOverlay() {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex items-center text-primary">
        <Loader2 className="mr-3 h-8 w-8 animate-spin" />
        <span className="text-lg font-semibold">Loading...</span>
      </div>
    </div>
  );
}

// Inner component to consume the sidebar context
function DashboardNav({ navItems, userRole }: { navItems: NavItem[], userRole: string }) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile, setOpen } = useSidebar();
  const [isNavigating, setIsNavigating] = React.useState(false);
  const authState = useAuth();
  const isSuperAdmin = false; // Placeholder for future logic

  React.useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  const handleLinkClick = (href: string) => (e: React.MouseEvent) => {
    if (href !== pathname) {
      setIsNavigating(true);
    }
    // Collapse sidebar on navigation
    if (isMobile) {
      setOpenMobile(false);
    } else {
      setOpen(false);
    }
  };

  const finalNavItems = navItems.filter(item => {
    if (!item.requiredRole) return true;
    if (isSuperAdmin) return true;
    return item.requiredRole === 'admin';
  });

  return (
    <>
      {isNavigating && <LoadingOverlay />}
      <SidebarMenu>
        {finalNavItems.map((item) => {
          const IconComponent = iconComponents[item.iconName];
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const hasNotification = item.notificationId ? !!(authState as any)[item.notificationId] : false;

          return (
            <SidebarMenuItem key={item.label}>
              <Link href={item.href} className="relative" onClick={handleLinkClick(item.href)}>
                <SidebarMenuButton isActive={isActive} tooltip={{ children: item.label, className: "text-xs" }} className="justify-start">
                  {IconComponent && <IconComponent className="h-5 w-5" />}
                  <span>{item.label}</span>
                </SidebarMenuButton>
                {hasNotification && (
                    <span className="absolute left-2 top-2 h-2 w-2 rounded-full bg-blue-500 group-data-[collapsible=icon]:left-1/2 group-data-[collapsible=icon]:-translate-x-1/2 group-data-[collapsible=icon]:top-1"></span>
                )}
              </Link>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </>
  );
}


function DashboardFooter({ userRole }: { userRole: string }) {
    const pathname = usePathname();
    const router = useRouter();
    const { toast } = useToast();
    const supabase = getSupabase();
    const { isMobile, setOpenMobile, setOpen } = useSidebar();

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
            toast({ title: "Logged Out", description: "You have been successfully logged out." });
            router.push("/");
        }
    }, [supabase, toast, router]);

    const handleFooterLinkClick = (e: React.MouseEvent) => {
        if (isMobile) {
            setOpenMobile(false);
        } else {
            setOpen(false);
        }
    };

    return (
        <SidebarFooter className="p-2 border-t border-sidebar-border">
            <SidebarMenu>
                <SidebarMenuItem>
                    <Link href={`/${userRole.toLowerCase()}/profile`} onClick={handleFooterLinkClick}>
                        <SidebarMenuButton isActive={pathname === `/${userRole.toLowerCase()}/profile`} tooltip={{ children: "Profile", className: "text-xs" }} className="justify-start">
                            <UserCircle className="h-5 w-5" />
                            <span>Profile</span>
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <Link href={`/${userRole.toLowerCase()}/settings`} onClick={handleFooterLinkClick}>
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
    );
}

const MobileAwareSheetTitle = ({ userRole }: { userRole: string }) => {
  const { isMobile } = useSidebar(); 
  if (!isMobile) {
    return null;
  }
  return <SheetTitle className="text-lg font-semibold text-primary">{userRole} Portal</SheetTitle>;
};

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export default function DashboardLayout({ children, navItems, userRole }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  
  const [sidebarOpenState, setSidebarOpenState] = React.useState<boolean | undefined>(undefined);
  const [userDisplayName, setUserDisplayName] = React.useState<string>(userRole);
  const [schoolName, setSchoolName] = React.useState<string | null>(null);
  const [schoolLogo, setSchoolLogo] = React.useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = React.useState<string | undefined>(undefined);
  const [isNavigating, setIsNavigating] = React.useState(false);

  const footerYear = new Date().getFullYear(); 

  const supabase = React.useMemo(() => {
    try {
      return getSupabase();
    } catch (e: any) {
      console.error("Error getting Supabase client on layout:", e.message);
      return null;
    }
  }, []);

  React.useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);


  React.useEffect(() => {
    if (!supabase) return;

    const fetchInitialData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUserDisplayName(user.user_metadata?.full_name || user.email || userRole);
        }

        const { data: settings } = await supabase.from('app_settings').select('school_name, school_logo_url, updated_at').eq('id', 1).single();
        if (settings) {
            setSchoolName(settings.school_name);
            setSchoolLogo(settings.school_logo_url);
            setUpdatedAt(settings.updated_at);
        }
    };
    fetchInitialData();
  }, [supabase, userRole]);

  React.useEffect(() => {
    const cookieValue = typeof document !== 'undefined' ? document.cookie.includes(`${SIDEBAR_COOKIE_NAME}=true`) : true;
    setSidebarOpenState(cookieValue);
  }, []);

  const isControlled = typeof sidebarOpenState === 'boolean';
  
  const userInitials = userDisplayName?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || "U";

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
        <Sidebar side="left" variant="sidebar" collapsible="icon" className="bg-sidebar text-sidebar-foreground">
          <SidebarHeader className="p-4 border-b border-sidebar-border">
            <div className="flex items-center justify-between">
              <Logo size="sm" className="text-sidebar-foreground group-data-[collapsible=icon]:hidden" schoolName={schoolName} imageUrl={schoolLogo} updated_at={updatedAt} />
              <SidebarTrigger className="text-sidebar-foreground hover:text-sidebar-accent-foreground" />
            </div>
            <MobileAwareSheetTitle userRole={userRole} />
          </SidebarHeader>
          <SidebarContent className="p-2">
            <DashboardNav navItems={navItems} userRole={userRole} />
          </SidebarContent>
          <DashboardFooter userRole={userRole} />
        </Sidebar>
        <SidebarInset>
          <header className="p-4 border-b flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-40">
            <div className="md:hidden"><SidebarTrigger /></div>
            <h1 className="text-xl font-semibold text-primary">{`${userRole} Portal`}</h1>
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar>
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userDisplayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">{userRole}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/${userRole.toLowerCase()}/profile`}><UserCircle className="mr-2 h-4 w-4" /><span>Profile</span></Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/${userRole.toLowerCase()}/settings`}><Settings className="mr-2 h-4 w-4" /><span>Settings</span></Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                 <DropdownMenuItem onClick={async () => {
                        if (!supabase) return;
                        await supabase.auth.signOut();
                        router.push("/");
                    }}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="p-4 md:p-6 relative">
            {children}
          </main>
          <footer className="p-4 border-t text-sm text-muted-foreground text-center">
            &copy; {footerYear} {schoolName || 'School'}. All Rights Reserved.
          </footer>
        </SidebarInset>
      </SidebarProvider>
  );
}
