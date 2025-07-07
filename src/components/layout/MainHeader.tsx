
"use client";

import { Logo } from '@/components/shared/Logo';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { UserCircle, LogIn, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navLinks = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About Us" },
    { href: "/admissions", label: "Admissions" },
    { href: "/programs", label: "Programs" },
    { href: "/contact", label: "Contact" },
];

export function MainHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="py-4 px-6 border-b sticky top-0 bg-background/95 backdrop-blur z-50">
      <div className="container mx-auto flex justify-between items-center">
        <Logo size="md" />
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {navLinks.map(link => (
            <Link key={link.label} href={link.href} passHref>
              <span className={cn(
                  "text-sm font-medium text-muted-foreground hover:text-primary transition-colors",
                  pathname === link.href && "text-primary"
              )}>
                {link.label}
              </span>
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center space-x-2">
           <Button variant="default" asChild>
            <Link href="/portals">
              <LogIn className="mr-2 h-4 w-4" /> Portals Login
            </Link>
          </Button>
        </div>

        {/* Mobile Menu Trigger */}
        <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                <span className="sr-only">Toggle Menu</span>
            </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
         <div className="md:hidden mt-4">
            <nav className="flex flex-col items-center space-y-4">
                 {navLinks.map(link => (
                    <Link key={link.label} href={link.href} passHref>
                    <span 
                        className={cn(
                            "text-lg font-medium text-muted-foreground hover:text-primary transition-colors",
                            pathname === link.href && "text-primary"
                        )}
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        {link.label}
                    </span>
                    </Link>
                ))}
                 <Button variant="default" asChild className="w-full mt-4">
                    <Link href="/portals" onClick={() => setIsMobileMenuOpen(false)}>
                    <LogIn className="mr-2 h-4 w-4" /> Portals Login
                    </Link>
                </Button>
            </nav>
        </div>
      )}
    </header>
  );
}
