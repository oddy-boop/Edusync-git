"use client";

import Link from "next/link";
import { usePathname } from 'next/navigation';
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Menu, Facebook, Twitter, Instagram, Linkedin, Loader2, Wifi, WifiOff } from "lucide-react";
import { CookieConsentBanner } from '@/components/shared/CookieConsentBanner';
import { cn } from "@/lib/utils";
import React, { useState, useEffect } from "react";
import { PwaInstallPrompt } from '@/components/shared/PwaInstallPrompt';
import { Alert, AlertDescription } from "@/components/ui/alert";


const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/news", label: "News" },
  { href: "/admissions", label: "Admissions" },
  { href: "/programs", label: "Programs" },
  { href: "/contact", label: "Contact Us" },
  { href: "/donate", label: "Donate" },
];

interface PublicLayoutProps {
  children: React.ReactNode;
  schoolName: string | null | undefined;
  logoUrl: string | null | undefined;
  schoolAddress: string | null | undefined;
  schoolEmail: string | null | undefined;
  academicYear?: string | null | undefined;
  socials: {
    facebook: string | null | undefined;
    twitter: string | null | undefined;
    instagram: string | null | undefined;
    linkedin: string | null | undefined;
  } | null | undefined;
  updated_at?: string;
}

export default function PublicLayout({
  children,
  schoolName,
  logoUrl,
  schoolAddress,
  schoolEmail,
  academicYear,
  socials,
  updated_at,
}: PublicLayoutProps) {
    
  const pathname = usePathname();
  const isHomePage = pathname === '/';
  const [isNavigating, setIsNavigating] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);

  useEffect(() => {
    // Component Did Mount
    if (typeof window !== 'undefined') {
      setIsOnline(window.navigator.onLine);
    }
  
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineAlert(false);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineAlert(true);
    };
  
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  
    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  const handleNavigate = (href: string) => (e: React.MouseEvent) => {
    if (href !== pathname) {
      setIsNavigating(true);
    }
  };

  const startYear = 2024;
  const endYear = academicYear ? parseInt(academicYear.split('-')[1], 10) : new Date().getFullYear();
  const currentSchoolName = schoolName || 'School';

  const yearDisplay = startYear >= endYear ? startYear.toString() : `${startYear}-${endYear}`;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
       {isNavigating && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
       )}
       <header className={cn(
          "sticky top-0 z-50 w-full",
          isHomePage ? "absolute bg-transparent" : "bg-background/80 backdrop-blur border-b"
        )}>
        <div className="container mx-auto flex h-20 items-center justify-between">
          <Logo size="md" schoolName={schoolName} imageUrl={logoUrl} updated_at={updated_at} className={cn(isHomePage && "text-white")}/>
          
           <nav className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={handleNavigate(link.href)}
                  className={cn(
                      "text-sm font-medium transition-colors hover:text-primary",
                      isHomePage ? "text-primary-foreground/80 hover:text-primary-foreground" : "text-muted-foreground"
                  )}
                >
                {link.label}
                </Link>
            ))}
          </nav>
          
          <div className="flex items-center gap-2">
            <PwaInstallPrompt />
            <Button asChild className="hidden lg:inline-flex">
              <Link href="/portals" onClick={handleNavigate('/portals')}>User Portals</Link>
            </Button>
            
            <div className="lg:hidden">
              <Sheet>
                <SheetTrigger asChild>
                <Button variant="outline" size="icon" className={cn(isHomePage && "text-white bg-white/10 hover:bg-white/20 border-white/30")}>
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Open navigation menu</span>
                </Button>
                </SheetTrigger>
                <SheetContent side="right">
                    <SheetTitle className="sr-only">Mobile Navigation Menu</SheetTitle>
                    <div className="p-4">
                        <Logo size="sm" schoolName={schoolName} imageUrl={logoUrl} updated_at={updated_at}/>
                        <nav className="flex flex-col space-y-4 mt-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.label}
                                href={link.href}
                                onClick={handleNavigate(link.href)}
                                className="text-lg font-medium text-foreground transition-colors hover:text-primary"
                            >
                                {link.label}
                            </Link>
                            ))}
                             <Link
                                href="/portals"
                                onClick={handleNavigate('/portals')}
                                className="text-lg font-medium text-foreground transition-colors hover:text-primary"
                            >
                                User Portals
                            </Link>
                        </nav>
                    </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-grow">
        {showOfflineAlert && (
            <Alert variant="destructive" className="container mx-auto mt-4 rounded-md">
                <WifiOff className="h-4 w-4" />
                <AlertDescription>
                You are currently offline. Some features may be unavailable.
                </AlertDescription>
            </Alert>
        )}
        {children}
      </main>
      <footer className="bg-primary text-primary-foreground">
        <div className="container mx-auto py-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-semibold text-primary-foreground mb-2">{currentSchoolName}</h3>
              <p className="text-sm text-primary-foreground/80">
                A modern platform for educational excellence.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-primary-foreground mb-2">Quick Links</h3>
              <ul className="space-y-1">
                {navLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href || '#'}
                      onClick={handleNavigate(link.href)}
                      className="text-sm text-primary-foreground/80 hover:text-primary-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-primary-foreground mb-2">Portals</h3>
              <ul className="space-y-1">
                 <li><Link href="/auth/student/login" onClick={handleNavigate('/auth/student/login')} className="text-sm text-primary-foreground/80 hover:text-primary-foreground">Student Portal</Link></li>
                 <li><Link href="/auth/teacher/login" onClick={handleNavigate('/auth/teacher/login')} className="text-sm text-primary-foreground/80 hover:text-primary-foreground">Teacher Portal</Link></li>
                 <li><Link href="/auth/admin/login" onClick={handleNavigate('/auth/admin/login')} className="text-sm text-primary-foreground/80 hover:text-primary-foreground">Admin Portal</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-primary-foreground mb-2">Contact Us</h3>
              <p className="text-sm text-primary-foreground/80">{schoolAddress || "Location not set"}</p>
              <p className="text-sm text-primary-foreground/80">{schoolEmail || "Email not set"}</p>
              <div className="flex items-center space-x-3 mt-4">
                {socials?.facebook && <a href={socials.facebook} target="_blank" rel="noopener noreferrer" className="text-primary-foreground/80 hover:text-accent"><Facebook size={20}/></a>}
                {socials?.twitter && <a href={socials.twitter} target="_blank" rel="noopener noreferrer" className="text-primary-foreground/80 hover:text-accent"><Twitter size={20}/></a>}
                {socials?.instagram && <a href={socials.instagram} target="_blank" rel="noopener noreferrer" className="text-primary-foreground/80 hover:text-accent"><Instagram size={20}/></a>}
                {socials?.linkedin && <a href={socials.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary-foreground/80 hover:text-accent"><Linkedin size={20}/></a>}
              </div>
            </div>
          </div>
          <div className="mt-8 border-t border-primary-foreground/20 pt-4 text-center text-sm text-primary-foreground/70">
            <p>&copy; {yearDisplay} {currentSchoolName}. All Rights Reserved.</p>
            <p>Designed by Richard Odoom</p>
          </div>
        </div>
      </footer>
      <CookieConsentBanner />
    </div>
  );
}
