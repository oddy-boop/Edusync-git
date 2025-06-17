import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export function PlaceholderContent({ title, description, icon: Icon }: { title: string, description?: string, icon?: LucideIcon }) {
  return (
    <Card className="w-full shadow-lg border-dashed border-primary/30 bg-primary/5">
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="flex items-center gap-3 text-primary/80 text-xl md:text-2xl">
          {Icon && <Icon className="h-6 w-6 md:h-8 md:w-8 text-primary/60" />}
          <span className="font-headline">{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
        <CardDescription className="text-foreground/70">
          {description || "This feature is currently under development. Please check back soon for updates!"}
        </CardDescription>
      </CardContent>
    </Card>
  );
}
