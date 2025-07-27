
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PlaceholderContent({ title, description, icon: Icon }: { title: string, description?: string, icon?: LucideIcon }) {
  return (
    <Card className="w-full shadow-lg border-dashed border-primary/30 bg-primary/5 overflow-hidden">
      <CardHeader className="p-4 md:p-5"> {/* Base padding p-4, md for larger step */}
        <CardTitle className={cn(
          "flex items-center gap-2 text-primary/80 font-headline",
          "text-xl md:text-2xl" // Responsive title
        )}>
          {Icon && <Icon className={cn(
            "text-primary/60 shrink-0", // Added shrink-0
            "h-6 w-6 md:h-7 md:w-7" // Responsive icon
          )} />}
          <span className="break-words">{title}</span> {/* Added break-words */}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 md:p-5 md:pt-0"> {/* Consistent padding with header */}
        <CardDescription className={cn(
          "text-foreground/70 leading-relaxed", // Ensure good line height
          "text-sm md:text-base" // Responsive description
        )}>
          {description || "This feature is currently under development. Please check back soon for updates!"}
        </CardDescription>
      </CardContent>
    </Card>
  );
}
