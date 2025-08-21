import { cn } from "@/lib/utils";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid md:grid-cols-1 antialiased">
      <div className="relative overflow-hidden md:flex">
        <main
          className={cn(
            "container absolute inset-0 flex items-center justify-center"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
