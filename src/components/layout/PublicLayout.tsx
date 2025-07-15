
import Link from "next/link";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/admissions", label: "Admissions" },
  { href: "/programs", label: "Programs" },
  { href: "/contact", label: "Contact" },
];

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-background/95 backdrop-blur border-b sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center h-20">
          <Logo size="md" />
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
          <Button asChild>
            <Link href="/portals">User Portals</Link>
          </Button>
        </div>
      </header>
      <main className="flex-grow">{children}</main>
      <footer className="bg-primary/5 border-t">
        <div className="container mx-auto py-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-semibold text-primary mb-2">EduSync</h3>
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
            </div>
          </div>
          <div className="mt-8 border-t pt-4 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} EduSync. All Rights Reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
