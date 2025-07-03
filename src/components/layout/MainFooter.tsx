
"use client";

export function MainFooter() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="py-8 px-6 border-t bg-muted/50">
      <div className="container mx-auto text-center text-muted-foreground">
        <p>&copy; {currentYear}. All Rights Reserved.</p>
        <p className="text-sm mt-1">Powered by Richard Odoom</p>
      </div>
    </footer>
  );
}
