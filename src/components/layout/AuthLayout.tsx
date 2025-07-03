
import { Logo } from '@/components/shared/Logo';

export default function AuthLayout({
  children,
  title,
  description,
}: {
  children: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="py-4 px-6 border-b">
        <Logo size="md" />
      </header>
      <main className="flex-grow flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-background">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-headline font-semibold text-primary">{title}</h1>
            <p className="text-muted-foreground mt-1">{description}</p>
          </div>
          {children}
        </div>
      </main>
       <footer className="py-6 px-6 border-t text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()}. All Rights Reserved.
      </footer>
    </div>
  );
}

    