
import Link from "next/link";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { getSupabase } from "@/lib/supabaseClient";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Menu, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import { Separator } from "../ui/separator";
import { CookieConsentBanner } from "../shared/CookieConsentBanner";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/admissions", label: "Admissions" },
  { href: "/programs", label: "Programs" },
  { href: "/contact", label: "Contact" },
];

async function getPublicLayoutSettings() {
    const supabase = getSupabase();
    try {
        const { data, error } = await supabase.from('app_settings').select('school_name, school_logo_url, facebook_url, twitter_url, instagram_url, linkedin_url').eq('id', 1).single();
        if (error && error.code !== 'PGRST116') throw error;
        return {
            schoolName: data?.school_name,
            logoUrl: data?.school_logo_url,
            socials: {
                facebook: data?.facebook_url,
                twitter: data?.twitter_url,
                instagram: data?.instagram_url,
                linkedin: data?.linkedin_url,
            }
        };
    } catch(error) {
        console.error("Error fetching layout settings:", error);
        return { 
            schoolName: "EduSync", 
            logoUrl: null, 
            socials: { facebook: null, twitter: null, instagram: null, linkedin: null }
        };
    }
}

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { schoolName, logoUrl, socials } = await getPublicLayoutSettings();
    
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-background/95 backdrop-blur border-b sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center h-20">
          <Logo size="md" schoolName={schoolName} imageUrl={logoUrl} />
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild className="hidden md:inline-flex">
              <Link href="/portals">User Portals</Link>
            </Button>
            <div className="md:hidden">
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
                       <Logo size="sm" schoolName={schoolName} imageUrl={logoUrl} />
                       <nav className="flex flex-col space-y-4 mt-8">
                         {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="text-lg font-medium text-foreground transition-colors hover:text-primary"
                            >
                                {link.label}
                            </Link>
                            ))}
                        </nav>
                        <Separator className="my-6" />
                        <Button asChild className="w-full">
                            <Link href="/portals">User Portals</Link>
                        </Button>
                    </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-grow">{children}</main>
      <footer className="bg-primary/5 border-t">
        <div className="container mx-auto py-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-semibold text-primary mb-2">{schoolName || "EduSync"}</h3>
              <p className="text-sm text-muted-foreground">
                A modern platform for educational excellence.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-primary mb-2">Quick Links</h3>
              <ul className="space-y-1">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-primary mb-2">Portals</h3>
              <ul className="space-y-1">
                 <li><Link href="/auth/student/login" className="text-sm text-muted-foreground hover:text-primary">Student Portal</Link></li>
                 <li><Link href="/auth/teacher/login" className="text-sm text-muted-foreground hover:text-primary">Teacher Portal</Link></li>
                 <li><Link href="/auth/admin/login" className="text-sm text-muted-foreground hover:text-primary">Admin Portal</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-primary mb-2">Contact Us</h3>
              <p className="text-sm text-muted-foreground">Accra, Ghana</p>
              <p className="text-sm text-muted-foreground">info@edusync.com</p>
              <div className="flex items-center space-x-3 mt-4">
                {socials.facebook && <a href={socials.facebook} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><Facebook size={20}/></a>}
                {socials.twitter && <a href={socials.twitter} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><Twitter size={20}/></a>}
                {socials.instagram && <a href={socials.instagram} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><Instagram size={20}/></a>}
                {socials.linkedin && <a href={socials.linkedin} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><Linkedin size={20}/></a>}
              </div>
            </div>
          </div>
          <div className="mt-8 border-t pt-4 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} {schoolName || "EduSync"}. All Rights Reserved.
          </div>
        </div>
      </footer>
      <CookieConsentBanner />
    </div>
  );
}
