
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  FileText,
  Sparkles,
  QrCode,
  TrendingUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client"; 
import { AuthContext, useAuth } from "@/lib/auth-context";
import { LoadingBar } from '@/components/shared/LoadingBar';
import { OddyChatWidget } from '@/components/shared/OddyChatWidget';

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

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
  FileText,
  Sparkles,
  QrCode,
  TrendingUp,
};

export type IconName = keyof typeof iconComponents;

export interface NavItem {
  href: string;
  label:string;
  iconName: IconName;
  requiredRole?: 'admin' | 'super_admin' | 'accountant';
  notificationId?: string;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  navItems: NavItem[];
  userRole: "Admin" | "Teacher" | "Student" | "Accountant" | "Super Admin";
  settingsPath?: string;
}

// Inner component to consume the sidebar context
function DashboardNav({ navItems, onNavigate }: { navItems: NavItem[], onNavigate: () => void }) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const authContext = useAuth();
  
  const finalNavItems = navItems.filter(item => {
    if (!item.requiredRole) {
      return true;
    }
    if (authContext.role === 'super_admin') {
      return true;
    }
    // Ensures admin sees admin-specific and non-role-specific items.
    if (authContext.role === 'admin' && item.requiredRole === 'admin') {
        return true;
    }
    // Ensures accountant sees accountant-specific items.
    if(authContext.role === 'accountant' && item.requiredRole === 'accountant') {
        return true;
    }
    return false;
  });


  const handleLinkClick = (href: string) => (e: React.MouseEvent) => {
    if (href !== pathname) {
        onNavigate();
    }
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
      <SidebarMenu>
        {finalNavItems.map((item) => {
          const IconComponent = iconComponents[item.iconName];
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <SidebarMenuItem key={item.label}>
              <Link href={item.href} className="relative" onClick={handleLinkClick(item.href)}>
                <SidebarMenuButton isActive={isActive} tooltip={{ children: item.label, className: "text-xs" }} className="justify-start">
                  {IconComponent && <IconComponent className="h-5 w-5" />}
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
  );
}


function DashboardFooter({ userRole, onNavigate, settingsPath }: { userRole: string, onNavigate: () => void, settingsPath: string }) {
    const pathname = usePathname();
    const router = useRouter();
    const { toast } = useToast();
    const supabase = createClient();
    const { isMobile, setOpenMobile } = useSidebar();
    const profilePath = `/${userRole.toLowerCase().replace(' ', '-')}/profile`;

    const handleLogout = React.useCallback(async () => {
        onNavigate();
        await supabase.auth.signOut();
        toast({ title: "Logged Out", description: "You have been successfully logged out." });
        router.push("/portals");
    }, [supabase, toast, router, onNavigate]);

    const handleFooterLinkClick = (href: string) => (e: React.MouseEvent) => {
        if (href !== pathname) {
            onNavigate();
        }
        if (isMobile) {
            setOpenMobile(false);
        }
    };

    return (
        <SidebarFooter className="p-2 border-t border-sidebar-border">
            <SidebarMenu>
                <SidebarMenuItem>
                    <Link href={profilePath} onClick={handleFooterLinkClick(profilePath)}>
                        <SidebarMenuButton isActive={pathname === profilePath} tooltip={{ children: "Profile", className: "text-xs" }} className="justify-start">
                            <UserCircle className="mr-2 h-5 w-5" />
                            <span>Profile</span>
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <Link href={settingsPath} onClick={handleFooterLinkClick(settingsPath)}>
                        <SidebarMenuButton isActive={pathname === settingsPath} tooltip={{ children: "Settings", className: "text-xs" }} className="justify-start">
                            <Settings className="mr-2 h-5 w-5" />
                            <span>Settings</span>
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton onClick={handleLogout} tooltip={{ children: "Logout", className: "text-xs" }} className="justify-start">
                        <LogOut className="mr-2 h-5 w-5" />
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


export default function DashboardLayout({ children, navItems, userRole, settingsPath: settingsPathProp }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [sidebarOpenState, setSidebarOpenState] = React.useState<boolean | undefined>(undefined);
  const [isNavigating, setIsNavigating] = React.useState(false);

  const authContext = useAuth();
  const settingsPath = settingsPathProp || `/${userRole.toLowerCase()}/settings`;
  const supabase = createClient();

  React.useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  React.useEffect(() => {
    const cookieValue = typeof document !== 'undefined' ? document.cookie.includes(`${SIDEBAR_COOKIE_NAME}=true`) : true;
    setSidebarOpenState(cookieValue);
  }, []);

  const isControlled = typeof sidebarOpenState === 'boolean';
  
  const userInitials = authContext.fullName?.split(' ').map((n:string) => n[0]).join('').substring(0, 2).toUpperCase() || "U";
  const userDisplayName = authContext.fullName || authContext.user?.email || userRole;
  const footerYear = new Date().getFullYear();

  return (
    <AuthContext.Provider value={authContext}>
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
        {isNavigating && <LoadingBar />}
        <Sidebar side="left" variant="sidebar" collapsible="icon" className="bg-sidebar text-sidebar-foreground">
          <SidebarHeader className="p-4 border-b border-sidebar-border">
            <div className="flex items-center justify-between">
              <Logo size="sm" className="text-sidebar-foreground group-data-[collapsible=icon]:hidden" />
              <SidebarTrigger className="text-sidebar-foreground hover:text-sidebar-accent-foreground" />
            </div>
            <MobileAwareSheetTitle userRole={userRole} />
          </SidebarHeader>
          <SidebarContent className="p-2">
            <DashboardNav navItems={navItems} onNavigate={() => setIsNavigating(true)} />
          </SidebarContent>
          <DashboardFooter userRole={userRole} onNavigate={() => setIsNavigating(true)} settingsPath={settingsPath} />
        </Sidebar>
        <SidebarInset>
          <header className="p-4 border-b flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-40">
            <div className="md:hidden"><SidebarTrigger /></div>
            <div className="flex flex-col">
              <h1 className="text-xl font-semibold text-primary">{`${userRole} Portal`}</h1>
              {authContext.schoolName && <p className="text-xs text-muted-foreground">{authContext.schoolName}</p>}
            </div>
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
                    <p className="text-xs leading-none text-muted-foreground">{authContext.role ? authContext.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : userRole}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/${userRole.toLowerCase().replace(' ', '-')}/profile`} onClick={() => setIsNavigating(true)}><UserCircle className="mr-2 h-4 w-4" /><span>Profile</span></Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={settingsPath} onClick={() => setIsNavigating(true)}><Settings className="mr-2 h-4 w-4" /><span>Settings</span></Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                 <DropdownMenuItem onClick={async () => {
                        setIsNavigating(true);
                        await supabase.auth.signOut();
                        router.push("/portals");
                    }}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="p-4 md:p-6 relative">
            {authContext.isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
                    <p className="text-lg text-muted-foreground">Loading session...</p>
                </div>
            ) : children}
            {authContext.isAdmin && <OddyChatWidget />}
          </main>
          <footer className="p-4 border-t text-sm text-muted-foreground text-center">
            &copy; {footerYear} {authContext.schoolName || 'School'}. All Rights Reserved.
          </footer>
        </SidebarInset>
      </SidebarProvider>
    </AuthContext.Provider>
  );
}
