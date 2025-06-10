import { Logo } from '@/components/shared/Logo';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { UserCircle, LogIn } from 'lucide-react';

export function MainHeader() {
  return (
    <header className="py-4 px-6 border-b sticky top-0 bg-background/95 backdrop-blur z-50">
      <div className="container mx-auto flex justify-between items-center">
        <Logo size="md" />
        <nav className="space-x-2">
          <Button variant="ghost" asChild>
            <Link href="/auth/student/login">
              <UserCircle className="mr-2 h-4 w-4" /> Student Portal
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/auth/teacher/login">
              <UserCircle className="mr-2 h-4 w-4" /> Teacher Portal
            </Link>
          </Button>
          <Button variant="default" asChild>
            <Link href="/auth/admin/login">
              <LogIn className="mr-2 h-4 w-4" /> Admin Login
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
