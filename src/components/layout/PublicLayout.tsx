
"use client";

import Link from "next/link";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Menu, Facebook, Twitter, Instagram, Linkedin, Search, ShoppingCart } from "lucide-react";
import { Separator } from "../ui/separator";
import { CookieConsentBanner } from "../shared/CookieConsentBanner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export const revalidate = 0; 

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { 
    label: "Pages", 
    links: [
      { href: "/admissions", label: "Admissions" },
      { href: "/programs", label: "Programs" },
      { href: "/contact", label: "Contact Us" },
    ]
  },
  { href: "#", label: "News" },
  { href: "#", label: "Campus" },
  { href: "#", label: "Donate" },
];

interface PublicLayoutProps {
  children: React.ReactNode;
  schoolName: string | null | undefined;
  logoUrl: string | null | undefined;
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
  socials,
  updated_at,
}: PublicLayoutProps) {
    
  const startYear = 2025; // The constant start year as requested
  const currentYear = new Date().getFullYear();
  const currentSchoolName = schoolName || 'EduSync Platform';

  const yearDisplay = `${startYear}-${currentYear}`;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="bg-background/80 backdrop-blur border-b sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center h-20">
          <Logo size="md" schoolName={schoolName} imageUrl={logoUrl} updated_at={updated_at} />
          
          <nav className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              link.links ? (
                <DropdownMenu key={link.label}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary p-0">
                      {link.label}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {link.links.map((subLink) => (
                      <DropdownMenuItem key={subLink.href} asChild>
                        <Link href={subLink.href}>{subLink.label}</Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  {link.label}
                </Link>
              )
            ))}
          </nav>

          <div className="flex items-center gap-2">
             <Button variant="ghost" size="icon" className="hidden md:inline-flex">
              <Search className="h-5 w-5" />
              <span className="sr-only">Search</span>
            </Button>
             <Button variant="ghost" size="icon" className="hidden md:inline-flex">
              <ShoppingCart className="h-5 w-5" />
              <span className="sr-only">Cart</span>
            </Button>
            <Button asChild>
              <Link href="/portals">User Portals</Link>
            </Button>
            <div className="lg:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon">
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
                          link.links ? (
                            <div key={link.label}>
                              <p className="text-lg font-medium text-foreground">{link.label}</p>
                              <div className="flex flex-col space-y-2 pl-4 mt-2">
                                {link.links.map(subLink => (
                                  <Link key={subLink.href} href={subLink.href} className="text-muted-foreground hover:text-primary">{subLink.label}</Link>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <Link
                                key={link.label}
                                href={link.href}
                                className="text-lg font-medium text-foreground transition-colors hover:text-primary"
                            >
                                {link.label}
                            </Link>
                           )
                          ))}
                        </nav>
                    </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-grow">{children}</main>
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
                 <li><Link href="/auth/student/login" className="text-sm text-primary-foreground/80 hover:text-primary-foreground">Student Portal</Link></li>
                 <li><Link href="/auth/teacher/login" className="text-sm text-primary-foreground/80 hover:text-primary-foreground">Teacher Portal</Link></li>
                 <li><Link href="/auth/admin/login" className="text-sm text-primary-foreground/80 hover:text-primary-foreground">Admin Portal</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-primary-foreground mb-2">Contact Us</h3>
              <p className="text-sm text-primary-foreground/80">Accra, Ghana</p>
              <p className="text-sm text-primary-foreground/80">info@example.com</p>
              <div className="flex items-center space-x-3 mt-4">
                {socials?.facebook && <a href={socials.facebook} target="_blank" rel="noopener noreferrer" className="text-primary-foreground/80 hover:text-accent"><Facebook size={20}/></a>}
                {socials?.twitter && <a href={socials.twitter} target="_blank" rel="noopener noreferrer" className="text-primary-foreground/80 hover:text-accent"><Twitter size={20}/></a>}
                {socials?.instagram && <a href={socials.instagram} target="_blank" rel="noopener noreferrer" className="text-primary-foreground/80 hover:text-accent"><Instagram size={20}/></a>}
                {socials?.linkedin && <a href={socials.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary-foreground/80 hover:text-accent"><Linkedin size={20}/></a>}
              </div>
            </div>
          </div>
          <div className="mt-8 border-t border-primary-foreground/20 pt-4 text-center text-sm text-primary-foreground/70">
            &copy; {yearDisplay} {currentSchoolName}. All Rights Reserved.
          </div>
        </div>
      </footer>
      <CookieConsentBanner />
    </div>
  );
}
