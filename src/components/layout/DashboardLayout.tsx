
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

const SIDEBAR_COOKIE_NAME = "sidebar_state_edusync";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

const MobileAwareSheetTitle = ({ userRole }: { userRole: string }) => {
  const { isMobile } = useSidebar(); 
  if (!isMobile) {
    return null;
  }
  return <SheetTitle className="text-lg font-semibold text-primary">{userRole} Portal</SheetTitle>;
};


export default function DashboardLayout({ children, navItems, userRole }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  
  const [sidebarOpenState, setSidebarOpenState] = React.useState<boolean | undefined>(undefined);
  const [userDisplayName, setUserDisplayName] = React.useState<string>(userRole);
  const schoolName = "EduSync"; 
  const footerYear = new Date().getFullYear(); 
  const isSuperAdmin = false; 

  const supabase = React.useMemo(() => {
    try {
      return getSupabase();
    } catch (e: any) {
      console.error("Error getting Supabase client on layout:", e.message);
      return null;
    }
  }, []);

  const authState = useAuth();

  React.useEffect(() => {
    if (!supabase) return;

    const fetchUserName = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUserDisplayName(user.user_metadata?.full_name || user.email || userRole);
        }
    };
    fetchUserName();
  }, [supabase, userRole]);

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


  React.useEffect(() => {
    const cookieValue = typeof document !== 'undefined' ? document.cookie.includes(`${SIDEBAR_COOKIE_NAME}=true`) : true;
    setSidebarOpenState(cookieValue);
  }, []);

  const isControlled = typeof sidebarOpenState === 'boolean';
  
  const userInitials = userDisplayName?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || "U";
  
  const finalNavItems = navItems.filter(item => {
    if (!item.requiredRole) return true;
    if (isSuperAdmin) return true;
    return item.requiredRole === 'admin';
  });

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
                const hasNotification = item.notificationId ? !!(authState as any)[item.notificationId] : false;

                return (
                  <SidebarMenuItem key={item.label}>
                    <Link href={item.href} className="relative">
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
            <h1 className="text-xl font-semibold text-primary">{`${userRole} Portal`}</h1>
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar>
                    {/* <AvatarImage src="/path-to-user-avatar.jpg" alt={userDisplayName} /> */}
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
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="p-4 md:p-6">{children}</main>
          <footer className="p-4 border-t text-sm text-muted-foreground text-center">
            &copy; {footerYear} {schoolName || 'EduSync'}. All Rights Reserved.
          </footer>
        </SidebarInset>
      </SidebarProvider>
  );
}
