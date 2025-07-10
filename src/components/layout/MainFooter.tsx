
"use client";

import { Logo } from '@/components/shared/Logo';
import Link from 'next/link';
import { Mail, Phone, MapPin } from 'lucide-react';

export interface FooterContactInfo {
    address: string;
    email: string;
    phone: string;
}

interface MainFooterProps {
    academicYear?: string;
    contactInfo: FooterContactInfo;
    schoolName: string | null;
}

export function MainFooter({ academicYear, contactInfo, schoolName }: MainFooterProps) {
  let displayYear: string | number;

  if (academicYear && /^\d{4}-\d{4}$/.test(academicYear)) {
    displayYear = academicYear.split('-')[1];
  } else {
    displayYear = new Date().getFullYear();
  }

  const footerLinks = [
      { href: "/about", label: "About Us" },
      { href: "/admissions", label: "Admissions" },
      { href: "/programs", label: "Programs" },
      { href: "/contact", label: "Contact Us" },
      { href: "/portals", label: "Portals Login" },
  ];

  return (
    <footer className="py-12 px-6 border-t bg-muted/50">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 text-muted-foreground">
        <div className="md:col-span-1 space-y-4">
            <Logo size="lg" schoolName="EduSync"/>
            <p className="text-sm">Fostering excellence and character in a nurturing environment.</p>
        </div>

        <div className='md:col-span-1'>
          <h3 className="font-semibold text-foreground mb-4">Quick Links</h3>
          <ul className="space-y-2">
            {footerLinks.map(link => (
                <li key={link.href}>
                    <Link href={link.href} className="text-sm hover:text-primary transition-colors">{link.label}</Link>
                </li>
            ))}
          </ul>
        </div>
        
        <div className='md:col-span-2'>
            <h3 className="font-semibold text-foreground mb-4">Contact Information</h3>
            <div className="space-y-3 text-sm">
                <p className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 mt-1 text-primary flex-shrink-0" />
                    <span>{contactInfo.address}</span>
                </p>
                 <a href={`mailto:${contactInfo.email}`} className="flex items-center gap-3 hover:text-primary transition-colors">
                    <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>{contactInfo.email}</span>
                </a>
                <a href={`tel:${contactInfo.phone}`} className="flex items-center gap-3 hover:text-primary transition-colors">
                    <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>{contactInfo.phone}</span>
                </a>
            </div>
        </div>
      </div>
       <div className="container mx-auto mt-12 pt-6 border-t border-border/50 text-center text-sm">
        <p>&copy; {displayYear} EduSync. All Rights Reserved.</p>
      </div>
    </footer>
  );
}
