
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react"; // Import React
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
  UserPlus, // Added UserPlus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  UserPlus, // Added UserPlus
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

export default function DashboardLayout({ children, navItems, userRole }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  // State to manage sidebar open state, determined after client-side mount
  const [sidebarOpenState, setSidebarOpenState] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    // This effect runs only on the client, after initial hydration
    const cookieValue = document.cookie.includes('sidebar_state=true');
    setSidebarOpenState(cookieValue);
  }, []); // Empty dependency array ensures this runs once on mount

  const handleLogout = async () => {
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    await new Promise(resolve => setTimeout(resolve, 500));
    router.push("/");
  };
  
  // For SSR and initial client render before useEffect runs, SidebarProvider will use its defaultOpen (true).
  // Once sidebarOpenState is set by useEffect, it will control the SidebarProvider.
  const isControlled = typeof sidebarOpenState === 'boolean';

  return (
    <SidebarProvider 
      defaultOpen={true} // Consistent for SSR and initial client render if sidebarOpenState is undefined
      open={isControlled ? sidebarOpenState : undefined} // Pass the determined state if available
      onOpenChange={isControlled ? setSidebarOpenState : undefined} // Allow SidebarProvider to update our state
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
                      isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
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
          <h1 className="text-xl font-semibold text-primary">{userRole} Dashboard</h1>
        </header>
        <main className="p-6">
          {children}
        </main>
        <footer className="p-4 border-t text-sm text-muted-foreground text-center">
          &copy; {new Date().getFullYear()} St. Joseph's Montessori. All Rights Reserved.
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
