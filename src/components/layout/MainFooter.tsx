
"use client";

export function MainFooter({ academicYear }: { academicYear?: string }) {
  let displayYear: string | number;

  if (academicYear && /^\d{4}-\d{4}$/.test(academicYear)) {
    // If academicYear is in "YYYY-YYYY" format, take the second year
    displayYear = academicYear.split('-')[1];
  } else {
    // Otherwise, use the provided year or default to the current calendar year
    displayYear = academicYear || new Date().getFullYear();
  }

  return (
    <footer className="py-8 px-6 border-t bg-muted/50">
      <div className="container mx-auto text-center text-muted-foreground">
        <p>&copy; {displayYear}. All Rights Reserved.</p>
        <p className="text-sm mt-1">Powered by Richard Odoom</p>
      </div>
    </footer>
  );
}
